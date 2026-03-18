use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallApkRequest {
    pub serial: String,
    pub apk_path: String,
    pub replace_existing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallApkResult {
    pub success: bool,
    pub raw_output: String,
    pub failure_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub success: bool,
    pub raw_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullResult {
    pub success: bool,
    pub files: Vec<String>,
    pub failed: Vec<String>,
}

/// pull 進捗イベントのペイロード
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullProgress {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub succeeded: usize,
    pub failed: usize,
}

/// 操作ログのエントリ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationLog {
    pub id: String,
    pub command_type: String,
    pub serial: String,
    pub timestamp: String,
    pub success: bool,
    pub detail: String,
}
