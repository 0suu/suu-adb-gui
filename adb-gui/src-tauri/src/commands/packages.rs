use crate::models::operation::CommandResult;
use crate::models::package::PackageSummary;
use crate::services::package_service;

#[tauri::command]
pub async fn get_packages(serial: String) -> Result<Vec<PackageSummary>, String> {
    package_service::get_packages(&serial)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn uninstall_package(serial: String, package_name: String) -> Result<CommandResult, String> {
    package_service::uninstall_package(&serial, &package_name)
        .await
        .map_err(|e| e.message)
}

#[tauri::command]
pub async fn run_package(serial: String, package_name: String) -> Result<CommandResult, String> {
    package_service::run_package(&serial, &package_name)
        .await
        .map_err(|e| e.message)
}
