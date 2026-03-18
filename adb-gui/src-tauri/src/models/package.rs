use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageSummary {
    pub package_name: String,
    pub label: Option<String>,
    pub launchable_activity: Option<String>,
}
