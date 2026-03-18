use crate::models::media::DeviceMediaFile;
use crate::models::operation::PullResult;
use crate::services::media_service;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_media_files(
    serial: String,
    filter: String,
) -> Result<Vec<DeviceMediaFile>, String> {
    media_service::list_media_files(&serial, &filter)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn pull_media_files(
    app: AppHandle,
    serial: String,
    remote_paths: Vec<String>,
    local_dir: String,
) -> Result<PullResult, String> {
    media_service::pull_media_files(&app, &serial, &remote_paths, &local_dir)
        .await
        .map_err(|e| e.message)
}
