use crate::models::operation::CommandResult;
use crate::models::package::PackageSummary;
use crate::services::process_manager::exec_adb_for_device;
use crate::utils::error::AppError;

const LIST_TIMEOUT: u64 = 10000;
const ACTION_TIMEOUT: u64 = 15000;

/// ユーザーアプリ一覧を取得 (`pm list packages -3`)
pub async fn get_packages(serial: &str) -> Result<Vec<PackageSummary>, AppError> {
    let output =
        exec_adb_for_device(serial, &["shell", "pm", "list", "packages", "-3"], LIST_TIMEOUT)
            .await?;

    let packages: Vec<PackageSummary> = output
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            line.strip_prefix("package:").map(|pkg| PackageSummary {
                package_name: pkg.to_string(),
                label: None,
                launchable_activity: None,
            })
        })
        .collect();

    Ok(packages)
}

/// アプリをアンインストール
pub async fn uninstall_package(serial: &str, package_name: &str) -> Result<CommandResult, AppError> {
    let output =
        exec_adb_for_device(serial, &["uninstall", package_name], ACTION_TIMEOUT).await?;

    let success = output.trim().contains("Success");
    Ok(CommandResult {
        success,
        raw_output: output,
    })
}

/// アプリを起動
/// 1. resolve-activity で activity を解決
/// 2. 失敗したら monkey で起動
pub async fn run_package(serial: &str, package_name: &str) -> Result<CommandResult, AppError> {
    // まず resolve-activity を試す
    let resolve_result = exec_adb_for_device(
        serial,
        &[
            "shell",
            "cmd",
            "package",
            "resolve-activity",
            "--brief",
            package_name,
        ],
        ACTION_TIMEOUT,
    )
    .await;

    if let Ok(output) = resolve_result {
        // 最後の行が activity 名 (package/activity 形式)
        let lines: Vec<&str> = output.lines().filter(|l| !l.trim().is_empty()).collect();
        if let Some(activity_line) = lines.last() {
            let activity = activity_line.trim();
            if is_valid_component_name(activity, package_name) {
                let start_result = exec_adb_for_device(
                    serial,
                    &["shell", "am", "start", "-n", activity],
                    ACTION_TIMEOUT,
                )
                .await?;

                if !start_result.contains("Error") && !start_result.contains("Exception") {
                    return Ok(CommandResult {
                        success: true,
                        raw_output: start_result,
                    });
                }
            }
        }
    }

    // フォールバック: monkey で起動
    let monkey_output = exec_adb_for_device(
        serial,
        &[
            "shell",
            "monkey",
            "-p",
            package_name,
            "-c",
            "android.intent.category.LAUNCHER",
            "1",
        ],
        ACTION_TIMEOUT,
    )
    .await?;

    let success = monkey_output.contains("Events injected: 1");
    Ok(CommandResult {
        success,
        raw_output: monkey_output,
    })
}

fn is_valid_component_name(component: &str, package_name: &str) -> bool {
    let Some((package, activity)) = component.split_once('/') else {
        return false;
    };

    !package.is_empty()
        && !activity.is_empty()
        && package == package_name
        && !component.contains(char::is_whitespace)
}
