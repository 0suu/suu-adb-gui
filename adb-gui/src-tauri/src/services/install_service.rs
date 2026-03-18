use crate::models::operation::{InstallApkRequest, InstallApkResult};
use crate::services::process_manager::exec_adb_for_device;
use crate::utils::error::AppError;

const INSTALL_TIMEOUT: u64 = 120000;

/// APK をインストール
pub async fn install_apk(req: &InstallApkRequest) -> Result<InstallApkResult, AppError> {
    // パスの存在確認
    if !std::path::Path::new(&req.apk_path).exists() {
        return Ok(InstallApkResult {
            success: false,
            raw_output: String::new(),
            failure_reason: Some(format!("APK ファイルが見つかりません: {}", req.apk_path)),
        });
    }

    let mut args = vec!["install"];
    if req.replace_existing {
        args.push("-r");
    }
    args.push(&req.apk_path);

    let output = exec_adb_for_device(&req.serial, &args, INSTALL_TIMEOUT).await?;
    let success = output.trim().ends_with("Success");
    let failure_reason = if success {
        None
    } else {
        Some(parse_install_failure(&output))
    };

    Ok(InstallApkResult {
        success,
        raw_output: output,
        failure_reason,
    })
}

/// インストール失敗理由を人間向けメッセージに変換
fn parse_install_failure(output: &str) -> String {
    let raw = output.trim();

    // Failure [REASON] パターンを探す
    if let Some(start) = raw.find("Failure [") {
        if let Some(end) = raw[start..].find(']') {
            let reason = &raw[start + 9..start + end];
            return match reason {
                "INSTALL_FAILED_VERSION_DOWNGRADE" => {
                    "バージョンダウングレードは許可されていません。-r オプションを試してください。"
                        .to_string()
                }
                "INSTALL_FAILED_UPDATE_INCOMPATIBLE" => {
                    "署名が異なるため更新できません。既存アプリを削除してから再インストールしてください。"
                        .to_string()
                }
                "INSTALL_FAILED_USER_RESTRICTED" => {
                    "ユーザー制限によりインストールが拒否されました。".to_string()
                }
                "INSTALL_FAILED_INSUFFICIENT_STORAGE" => {
                    "端末のストレージが不足しています。".to_string()
                }
                other => format!("インストール失敗: {}", other),
            };
        }
    }

    format!("インストール失敗: {}", raw)
}
