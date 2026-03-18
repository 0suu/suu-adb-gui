use std::path::PathBuf;
use std::process::{Command as StdCommand, Stdio};
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

use crate::utils::error::{AppError, ErrorKind};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// adb バイナリのパスを取得する
/// 開発時はシステムの adb を使い、本番では sidecar を使う
pub fn adb_path() -> String {
    // TODO: sidecar 対応時にパスを切り替える

    for candidate in adb_candidate_paths() {
        if candidate.exists() {
            return candidate.to_string_lossy().into_owned();
        }
    }

    // fallback: PATH に任せる
    adb_fallback_name().to_string()
}

#[cfg(target_os = "windows")]
fn adb_candidate_paths() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    for key in ["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Ok(root) = std::env::var(key) {
            candidates.push(PathBuf::from(root).join("platform-tools").join("adb.exe"));
        }
    }

    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        candidates.push(
            PathBuf::from(local_app_data)
                .join("Android")
                .join("Sdk")
                .join("platform-tools")
                .join("adb.exe"),
        );
    }

    candidates
}

#[cfg(not(target_os = "windows"))]
fn adb_candidate_paths() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    for key in ["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Ok(root) = std::env::var(key) {
            candidates.push(PathBuf::from(root).join("platform-tools").join("adb"));
        }
    }

    if let Ok(home) = std::env::var("HOME") {
        candidates.push(
            PathBuf::from(home)
                .join("Library")
                .join("Android")
                .join("sdk")
                .join("platform-tools")
                .join("adb"),
        );
    }

    candidates.extend([
        PathBuf::from("/usr/local/bin/adb"),
        PathBuf::from("/opt/homebrew/bin/adb"),
        PathBuf::from("/usr/bin/adb"),
    ]);

    candidates
}

#[cfg(target_os = "windows")]
fn adb_fallback_name() -> &'static str {
    "adb.exe"
}

#[cfg(not(target_os = "windows"))]
fn adb_fallback_name() -> &'static str {
    "adb"
}

#[cfg(target_os = "windows")]
pub fn configure_background_tokio_command(command: &mut Command) {
    use std::os::windows::process::CommandExt;

    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
pub fn configure_background_tokio_command(_command: &mut Command) {}

#[cfg(target_os = "windows")]
pub fn configure_background_std_command(command: &mut StdCommand) {
    use std::os::windows::process::CommandExt;

    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
pub fn configure_background_std_command(_command: &mut StdCommand) {}

/// adb コマンドを実行し、stdout を返す
pub async fn exec_adb(args: &[&str], timeout_ms: u64) -> Result<String, AppError> {
    let adb = adb_path();
    let mut command = Command::new(&adb);
    command
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_background_tokio_command(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                AppError {
                    message: format!("adb が見つかりません: {}", adb),
                    kind: ErrorKind::AdbNotFound,
                }
            } else {
                AppError::adb_execution(format!("adb 起動失敗: {}", e))
            }
        })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| AppError::adb_execution("stdout を取得できません"))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| AppError::adb_execution("stderr を取得できません"))?;

    let stdout_task = tokio::spawn(async move {
        let mut reader = stdout;
        let mut buf = Vec::new();
        reader
            .read_to_end(&mut buf)
            .await
            .map_err(|e| AppError::adb_execution(format!("stdout 読み取りエラー: {}", e)))?;
        Ok::<Vec<u8>, AppError>(buf)
    });
    let stderr_task = tokio::spawn(async move {
        let mut reader = stderr;
        let mut buf = Vec::new();
        reader
            .read_to_end(&mut buf)
            .await
            .map_err(|e| AppError::adb_execution(format!("stderr 読み取りエラー: {}", e)))?;
        Ok::<Vec<u8>, AppError>(buf)
    });

    let status = match timeout(Duration::from_millis(timeout_ms), child.wait()).await {
        Ok(result) => result.map_err(|e| AppError::adb_execution(format!("adb 実行エラー: {}", e)))?,
        Err(_) => {
            let _ = child.kill().await;
            let _ = child.wait().await;
            let _ = stdout_task.await;
            let _ = stderr_task.await;
            return Err(AppError::timeout(format!(
                "adb コマンドがタイムアウトしました ({}ms): adb {}",
                timeout_ms,
                args.join(" ")
            )));
        }
    };

    let stdout = stdout_task
        .await
        .map_err(|e| AppError::adb_execution(format!("stdout タスク失敗: {}", e)))??;
    let stderr = stderr_task
        .await
        .map_err(|e| AppError::adb_execution(format!("stderr タスク失敗: {}", e)))??;

    let stdout = String::from_utf8_lossy(&stdout).to_string();
    let stderr = String::from_utf8_lossy(&stderr).to_string();

    if !status.success() {
        let detail = if !stderr.trim().is_empty() {
            stderr.trim()
        } else if !stdout.trim().is_empty() {
            stdout.trim()
        } else {
            "出力がありません"
        };

        return Err(AppError::adb_execution(format!(
            "adb エラー (exit {}): {}",
            status.code().unwrap_or(-1),
            detail
        )));
    }

    Ok(stdout)
}

/// 特定デバイス向け adb コマンドを実行
pub async fn exec_adb_for_device(
    serial: &str,
    args: &[&str],
    timeout_ms: u64,
) -> Result<String, AppError> {
    let mut full_args = vec!["-s", serial];
    full_args.extend_from_slice(args);
    exec_adb(&full_args, timeout_ms).await
}

/// adb コマンドをストリーミング実行し、stdout の各行をコールバックに渡す
pub async fn exec_adb_streaming<F>(
    args: &[&str],
    mut on_line: F,
) -> Result<(), AppError>
where
    F: FnMut(String) + Send,
{
    let adb = adb_path();
    let mut command = Command::new(&adb);
    command
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_background_tokio_command(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| AppError::adb_execution(format!("adb 起動失敗: {}", e)))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| AppError::adb_execution("stdout を取得できません"))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| AppError::adb_execution("stderr を取得できません"))?;

    let stderr_task = tokio::spawn(async move {
        let mut reader = stderr;
        let mut buf = Vec::new();
        reader
            .read_to_end(&mut buf)
            .await
            .map_err(|e| AppError::adb_execution(format!("stderr 読み取りエラー: {}", e)))?;
        Ok::<Vec<u8>, AppError>(buf)
    });

    let mut reader = BufReader::new(stdout).lines();
    while let Some(line) = reader
        .next_line()
        .await
        .map_err(|e| AppError::adb_execution(format!("stdout 読み取りエラー: {}", e)))?
    {
        on_line(line);
    }

    let status = child
        .wait()
        .await
        .map_err(|e| AppError::adb_execution(format!("adb 実行エラー: {}", e)))?;
    let stderr = stderr_task
        .await
        .map_err(|e| AppError::adb_execution(format!("stderr タスク失敗: {}", e)))??;
    if !status.success() {
        let stderr = String::from_utf8_lossy(&stderr);
        return Err(AppError::adb_execution(format!(
            "adb エラー (exit {}): {}",
            status.code().unwrap_or(-1),
            if stderr.trim().is_empty() {
                "出力がありません"
            } else {
                stderr.trim()
            }
        )));
    }

    Ok(())
}
