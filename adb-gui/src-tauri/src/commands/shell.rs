use crate::models::operation::CommandResult;
use crate::services::process_manager;

#[tauri::command]
pub async fn run_adb_command(serial: String, args: Vec<String>) -> Result<CommandResult, String> {
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    match process_manager::exec_adb_for_device(&serial, &args_refs, 30_000).await {
        Ok(stdout) => Ok(CommandResult {
            success: true,
            raw_output: stdout,
        }),
        Err(e) => Ok(CommandResult {
            success: false,
            raw_output: e.message,
        }),
    }
}
