use crate::models::operation::{InstallApkRequest, InstallApkResult};
use crate::services::install_service;

#[tauri::command]
pub async fn install_apk(req: InstallApkRequest) -> Result<InstallApkResult, String> {
    install_service::install_apk(&req)
        .await
        .map_err(|e| e.message)
}
