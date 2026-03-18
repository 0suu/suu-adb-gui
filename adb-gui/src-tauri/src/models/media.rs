use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MediaKind {
    Photo,
    Video,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceMediaFile {
    pub path: String,
    pub name: String,
    pub kind: MediaKind,
    pub size_bytes: Option<u64>,
    pub modified_at: Option<String>,
}

/// 拡張子からメディア種別を判定
pub fn media_kind_from_ext(ext: &str) -> Option<MediaKind> {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "heic" => Some(MediaKind::Photo),
        "mp4" | "mov" | "3gp" | "mkv" | "webm" => Some(MediaKind::Video),
        _ => None,
    }
}
