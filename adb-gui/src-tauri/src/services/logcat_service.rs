use crate::services::process_manager::exec_adb_for_device;
use crate::utils::error::AppError;

const LOGCAT_TIMEOUT: u64 = 15000;

pub async fn get_logcat(serial: &str, lines: usize) -> Result<String, AppError> {
    let line_count = lines.to_string();
    exec_adb_for_device(
        serial,
        &["logcat", "-d", "-v", "time", "-t", &line_count],
        LOGCAT_TIMEOUT,
    )
    .await
}

pub async fn clear_logcat(serial: &str) -> Result<String, AppError> {
    exec_adb_for_device(serial, &["logcat", "-c"], LOGCAT_TIMEOUT).await
}
