use crate::models::media::{media_kind_from_ext, DeviceMediaFile, MediaKind};
use crate::models::operation::{PullProgress, PullResult};
use crate::services::process_manager::exec_adb_for_device;
use crate::utils::error::AppError;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

const LIST_TIMEOUT: u64 = 20000;
const PULL_TIMEOUT_PER_FILE: u64 = 60000;

const MEDIA_ROOTS: &[(&str, bool, bool)] = &[
    ("/sdcard/DCIM/", true, true),
    ("/sdcard/Pictures/", true, false),
    ("/sdcard/Movies/", false, true),
];

/// メディアファイル一覧を取得
pub async fn list_media_files(
    serial: &str,
    filter: &str,
) -> Result<Vec<DeviceMediaFile>, AppError> {
    let dirs = media_dirs_for_filter(filter);

    let mut all_files = Vec::new();
    let mut seen_paths = HashSet::new();

    for dir in dirs {
        let result = exec_adb_for_device(
            serial,
            &["shell", "find", dir, "-type", "f"],
            LIST_TIMEOUT,
        )
        .await;

        let output = match result {
            Ok(o) => o,
            Err(_) => continue, // ディレクトリが存在しない場合などはスキップ
        };

        for line in output.lines() {
            let path = line.trim().to_string();
            if path.is_empty() || seen_paths.contains(&path) {
                continue;
            }

            let name = path
                .rsplit('/')
                .next()
                .unwrap_or(&path)
                .to_string();

            let ext = name.rsplit('.').next().unwrap_or("");
            let kind = match media_kind_from_ext(ext) {
                Some(k) => k,
                None => continue, // メディアファイルでなければスキップ
            };

            // フィルタ適用
            match filter {
                "photo" if kind != MediaKind::Photo => continue,
                "video" if kind != MediaKind::Video => continue,
                _ => {}
            }

            seen_paths.insert(path.clone());
            all_files.push(DeviceMediaFile {
                path,
                name,
                kind,
                size_bytes: None,
                modified_at: None,
            });
        }
    }

    Ok(all_files)
}

/// ファイルを PC に pull
pub async fn pull_media_files(
    app: &AppHandle,
    serial: &str,
    remote_paths: &[String],
    local_dir: &str,
) -> Result<PullResult, AppError> {
    let total = remote_paths.len();
    let mut files = Vec::new();
    let mut failed = Vec::new();
    let mut reserved_paths = HashSet::new();

    for (i, remote_path) in remote_paths.iter().enumerate() {
        let file_name = remote_path.rsplit('/').next().unwrap_or("unknown");

        // 進捗通知
        let _ = app.emit(
            "pull-progress",
            PullProgress {
                current: i + 1,
                total,
                current_file: file_name.to_string(),
                succeeded: files.len(),
                failed: failed.len(),
            },
        );

        let local_path = build_pull_destination(local_dir, remote_path, &mut reserved_paths);
        if let Some(parent) = local_path.parent() {
            if std::fs::create_dir_all(parent).is_err() {
                failed.push(remote_path.clone());
                continue;
            }
        }

        let local_path_str = local_path.to_string_lossy().into_owned();
        let result = exec_adb_for_device(
            serial,
            &["pull", remote_path, &local_path_str],
            PULL_TIMEOUT_PER_FILE,
        )
        .await;

        match result {
            Ok(_) => files.push(local_path_str),
            Err(_) => failed.push(remote_path.clone()),
        }
    }

    Ok(PullResult {
        success: failed.is_empty(),
        files,
        failed,
    })
}

fn build_pull_destination(
    local_dir: &str,
    remote_path: &str,
    reserved_paths: &mut HashSet<PathBuf>,
) -> PathBuf {
    let mut candidate = PathBuf::from(local_dir);
    if let Some(relative_path) = remote_media_relative_path(remote_path) {
        candidate.push(relative_path);
    } else {
        candidate.push(remote_path.rsplit('/').next().unwrap_or("unknown"));
    }

    uniquify_local_path(candidate, reserved_paths)
}

fn remote_media_relative_path(remote_path: &str) -> Option<PathBuf> {
    for (root, _, _) in MEDIA_ROOTS {
        if let Some(stripped) = remote_path.strip_prefix(root) {
            let mut relative = PathBuf::new();
            relative.push(root.trim_matches('/').rsplit('/').next()?);
            for part in stripped.split('/').filter(|part| !part.is_empty()) {
                relative.push(part);
            }
            return Some(relative);
        }
    }

    None
}

fn media_dirs_for_filter(filter: &str) -> Vec<&'static str> {
    MEDIA_ROOTS
        .iter()
        .filter_map(|(dir, supports_photo, supports_video)| match filter {
            "photo" if *supports_photo => Some(*dir),
            "video" if *supports_video => Some(*dir),
            "all" => Some(*dir),
            _ => None,
        })
        .collect()
}

fn uniquify_local_path(path: PathBuf, reserved_paths: &mut HashSet<PathBuf>) -> PathBuf {
    if !path.exists() && reserved_paths.insert(path.clone()) {
        return path;
    }

    let parent = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("file");
    let extension = path.extension().and_then(|value| value.to_str());

    for suffix in 2.. {
        let mut candidate = parent.clone();
        let file_name = match extension {
            Some(ext) => format!("{stem} ({suffix}).{ext}"),
            None => format!("{stem} ({suffix})"),
        };
        candidate.push(file_name);

        if !candidate.exists() && reserved_paths.insert(candidate.clone()) {
            return candidate;
        }
    }

    unreachable!()
}
