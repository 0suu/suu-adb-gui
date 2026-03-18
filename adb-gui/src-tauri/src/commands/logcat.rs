use crate::services::logcat_service;

#[tauri::command]
pub async fn get_logcat(serial: String, lines: usize) -> Result<String, String> {
    logcat_service::get_logcat(&serial, lines)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn clear_logcat(serial: String) -> Result<String, String> {
    logcat_service::clear_logcat(&serial)
        .await
        .map_err(|e| e.message)
}
