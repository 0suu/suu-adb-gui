mod commands;
mod models;
mod services;
mod utils;

use commands::{devices, install, logcat, media, packages, shell};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            devices::list_devices,
            devices::get_device_status,
            devices::enable_adb_over_tcpip,
            devices::connect_wifi_device,
            devices::disconnect_wifi_device,
            devices::scan_subnet,
            devices::capture_screenshot,
            devices::load_device_name_mappings,
            devices::resolve_device_display_names,
            packages::get_packages,
            packages::uninstall_package,
            packages::run_package,
            install::install_apk,
            logcat::get_logcat,
            logcat::clear_logcat,
            media::list_media_files,
            media::pull_media_files,
            shell::run_adb_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
