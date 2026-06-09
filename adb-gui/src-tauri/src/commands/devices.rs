use crate::models::device::{
    DeviceDisplayNameMap, DeviceNameMapping, DeviceStatus, DeviceSummary, ScreenshotResult,
    SubnetScanResult, WifiConnectResult,
};
use crate::services::device_service;

#[tauri::command]
pub async fn list_devices() -> Result<Vec<DeviceSummary>, String> {
    device_service::list_devices().await.map_err(|e| e.message)
}

#[tauri::command]
pub async fn get_device_status(serial: String) -> Result<DeviceStatus, String> {
    device_service::get_device_status(&serial)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn enable_adb_over_tcpip(serial: String) -> Result<WifiConnectResult, String> {
    device_service::enable_adb_over_tcpip(&serial)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn connect_wifi_device(target: String) -> Result<WifiConnectResult, String> {
    device_service::connect_wifi_device(&target)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn disconnect_wifi_device(target: String) -> Result<String, String> {
    device_service::disconnect_wifi_device(&target)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn scan_subnet(port: Option<u16>) -> Result<SubnetScanResult, String> {
    device_service::scan_subnet_and_connect(port)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn capture_screenshot(
    serial: String,
    local_path: String,
) -> Result<ScreenshotResult, String> {
    device_service::capture_screenshot(&serial, &local_path)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub fn load_device_name_mappings(csv_path: String) -> Result<Vec<DeviceNameMapping>, String> {
    device_service::load_device_name_mappings(&csv_path).map_err(|e| e.message)
}

#[tauri::command]
pub async fn resolve_device_display_names(
    serials: Vec<String>,
    mappings: Vec<DeviceNameMapping>,
) -> Result<DeviceDisplayNameMap, String> {
    device_service::resolve_device_display_names(&serials, &mappings)
        .await
        .map_err(|e| e.message)
}
