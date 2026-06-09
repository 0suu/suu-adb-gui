use crate::models::device::{
    ConnectionType, DeviceDisplayNameMap, DeviceNameMapping, DeviceState, DeviceStatus,
    DeviceSummary, ScreenshotResult, SubnetScanResult, WifiConnectResult,
};
use crate::services::process_manager::{
    adb_path, configure_background_std_command, configure_background_tokio_command, exec_adb,
    exec_adb_for_device,
};
use crate::utils::error::AppError;
use std::collections::{HashMap, HashSet};
use std::net::{Ipv4Addr, UdpSocket};
use std::path::Path;
use std::process::{Command as StdCommand, Stdio};
use tokio::io::AsyncReadExt;
use tokio::net::TcpStream;
use tokio::process::Command;
use tokio::task::{spawn_blocking, JoinSet};
use tokio::time::{timeout, Duration};

const DEVICES_TIMEOUT: u64 = 5000;
const PROP_TIMEOUT: u64 = 3000;
const STATUS_TIMEOUT: u64 = 5000;
const SCREENSHOT_TIMEOUT: u64 = 15000;
const TCPIP_PORT: u16 = 5555;
const DISPLAY_NAME_SCAN_TIMEOUT: u64 = 20000;
const DISPLAY_NAME_IMAGE_DIRS: &[&str] = &["/sdcard/DCIM/", "/sdcard/Pictures/"];

/// `adb devices -l` を実行してデバイス一覧を取得
pub async fn list_devices() -> Result<Vec<DeviceSummary>, AppError> {
    let output = exec_adb(&["devices", "-l"], DEVICES_TIMEOUT).await?;
    let mut devices = Vec::new();

    for line in output.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let serial = parts[0].to_string();
        let state = DeviceState::from(parts[1]);

        // `model:XXX` や `transport_id:XXX` を抽出
        let mut model = None;
        let mut transport_id = None;
        for part in &parts[2..] {
            if let Some(val) = part.strip_prefix("model:") {
                model = Some(val.to_string());
            } else if let Some(val) = part.strip_prefix("transport_id:") {
                transport_id = Some(val.to_string());
            }
        }

        devices.push(DeviceSummary {
            serial: serial.clone(),
            state,
            model,
            android_version: None,
            transport_id,
            connection_type: connection_type_for_serial(&serial),
        });
    }

    // device 状態のものは Android バージョンを取得
    let mut version_tasks = JoinSet::new();
    for (index, device) in devices.iter().enumerate() {
        if device.state == DeviceState::Device {
            let serial = device.serial.clone();
            version_tasks.spawn(async move {
                (
                    index,
                    get_prop(&serial, "ro.build.version.release").await.ok(),
                )
            });
        }
    }

    while let Some(result) = version_tasks.join_next().await {
        if let Ok((index, Some(version))) = result {
            if let Some(device) = devices.get_mut(index) {
                device.android_version = Some(version);
            }
        }
    }

    Ok(devices)
}

/// getprop を実行
async fn get_prop(serial: &str, prop: &str) -> Result<String, AppError> {
    let output = exec_adb_for_device(serial, &["shell", "getprop", prop], PROP_TIMEOUT).await?;
    Ok(output.trim().to_string())
}

pub async fn get_device_status(serial: &str) -> Result<DeviceStatus, AppError> {
    let battery_serial = serial.to_string();
    let storage_serial = serial.to_string();
    let ip_serial = serial.to_string();

    let battery_task = tokio::spawn(async move {
        exec_adb_for_device(
            &battery_serial,
            &["shell", "dumpsys", "battery"],
            STATUS_TIMEOUT,
        )
        .await
    });
    let storage_task = tokio::spawn(async move {
        exec_adb_for_device(&storage_serial, &["shell", "df", "/sdcard"], STATUS_TIMEOUT).await
    });
    let ip_task = tokio::spawn(async move { get_wifi_ip(&ip_serial).await });

    let battery_output = battery_task
        .await
        .map_err(|e| AppError::adb_execution(format!("battery タスク失敗: {}", e)))??;
    let storage_output = storage_task
        .await
        .map_err(|e| AppError::adb_execution(format!("storage タスク失敗: {}", e)))??;
    let ip_address = ip_task
        .await
        .map_err(|e| AppError::adb_execution(format!("ip タスク失敗: {}", e)))?
        .ok();

    let (battery_level, charging, temperature_celsius) = parse_battery_status(&battery_output);
    let (storage_total_bytes, storage_free_bytes) = parse_storage_status(&storage_output);

    Ok(DeviceStatus {
        serial: serial.to_string(),
        connection_type: connection_type_for_serial(serial),
        ip_address,
        battery_level,
        charging,
        temperature_celsius,
        storage_free_bytes,
        storage_total_bytes,
    })
}

pub async fn enable_adb_over_tcpip(serial: &str) -> Result<WifiConnectResult, AppError> {
    let port = TCPIP_PORT.to_string();
    let tcpip_output = exec_adb_for_device(serial, &["tcpip", &port], STATUS_TIMEOUT).await?;
    let ip_address = get_wifi_ip(serial).await.ok();
    let connected_serial = ip_address.as_ref().map(|ip| format!("{ip}:{TCPIP_PORT}"));

    Ok(WifiConnectResult {
        success: true,
        raw_output: tcpip_output.trim().to_string(),
        ip_address,
        connected_serial,
    })
}

pub async fn connect_wifi_device(target: &str) -> Result<WifiConnectResult, AppError> {
    let formatted_target = if target.contains(':') {
        target.to_string()
    } else {
        format!("{target}:{TCPIP_PORT}")
    };
    let output = exec_adb(&["connect", &formatted_target], STATUS_TIMEOUT).await?;
    let success = adb_connect_output_indicates_success(&output);

    Ok(WifiConnectResult {
        success,
        raw_output: output.trim().to_string(),
        ip_address: formatted_target.split(':').next().map(|s| s.to_string()),
        connected_serial: success.then_some(formatted_target),
    })
}

pub async fn disconnect_wifi_device(target: &str) -> Result<String, AppError> {
    let output = exec_adb(&["disconnect", target], STATUS_TIMEOUT).await?;
    Ok(output.trim().to_string())
}

pub async fn capture_screenshot(
    serial: &str,
    local_path: &str,
) -> Result<ScreenshotResult, AppError> {
    if let Some(parent) = Path::new(local_path).parent() {
        std::fs::create_dir_all(parent)?;
    }

    let adb = adb_path();
    let mut command = Command::new(&adb);
    command
        .args(["-s", serial, "exec-out", "screencap", "-p"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_background_tokio_command(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| AppError::adb_execution(format!("adb 起動失敗: {}", e)))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| AppError::adb_execution("stdout を取得できません"))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| AppError::adb_execution("stderr を取得できません"))?;

    let stdout_task = tokio::spawn(async move {
        let mut reader = stdout;
        let mut buf = Vec::new();
        reader
            .read_to_end(&mut buf)
            .await
            .map_err(|e| AppError::adb_execution(format!("stdout 読み取りエラー: {}", e)))?;
        Ok::<Vec<u8>, AppError>(buf)
    });
    let stderr_task = tokio::spawn(async move {
        let mut reader = stderr;
        let mut buf = Vec::new();
        reader
            .read_to_end(&mut buf)
            .await
            .map_err(|e| AppError::adb_execution(format!("stderr 読み取りエラー: {}", e)))?;
        Ok::<Vec<u8>, AppError>(buf)
    });

    let status = match timeout(Duration::from_millis(SCREENSHOT_TIMEOUT), child.wait()).await {
        Ok(result) => {
            result.map_err(|e| AppError::adb_execution(format!("adb 実行エラー: {}", e)))?
        }
        Err(_) => {
            let _ = child.kill().await;
            let _ = child.wait().await;
            let _ = stdout_task.await;
            let _ = stderr_task.await;
            return Err(AppError::timeout(format!(
                "スクリーンショット取得がタイムアウトしました ({}ms)",
                SCREENSHOT_TIMEOUT
            )));
        }
    };

    let stdout = stdout_task
        .await
        .map_err(|e| AppError::adb_execution(format!("stdout タスク失敗: {}", e)))??;
    let stderr = stderr_task
        .await
        .map_err(|e| AppError::adb_execution(format!("stderr タスク失敗: {}", e)))??;

    if !status.success() {
        let stderr = String::from_utf8_lossy(&stderr);
        return Err(AppError::adb_execution(format!(
            "スクリーンショット取得失敗: {}",
            stderr.trim()
        )));
    }

    std::fs::write(local_path, stdout)?;

    Ok(ScreenshotResult {
        saved_path: local_path.to_string(),
    })
}

pub fn load_device_name_mappings(csv_path: &str) -> Result<Vec<DeviceNameMapping>, AppError> {
    let content = std::fs::read_to_string(csv_path)?;
    let records = parse_csv_records(&content)?;
    let mut mappings = Vec::new();

    for (index, record) in records.into_iter().enumerate() {
        if record.iter().all(|value| value.trim().is_empty()) {
            continue;
        }

        if record.len() < 2 {
            return Err(AppError::parse(format!(
                "CSV {} 行目に displayName,uuid の2列がありません",
                index + 1
            )));
        }

        let display_name = trim_bom(record[0].trim()).to_string();
        let uuid = record[1].trim().to_string();
        if index == 0 && uuid.eq_ignore_ascii_case("uuid") {
            continue;
        }
        if display_name.is_empty() || uuid.is_empty() {
            continue;
        }

        mappings.push(DeviceNameMapping { display_name, uuid });
    }

    Ok(mappings)
}

pub async fn resolve_device_display_names(
    serials: &[String],
    mappings: &[DeviceNameMapping],
) -> Result<DeviceDisplayNameMap, AppError> {
    let mut display_names = HashMap::new();
    if mappings.is_empty() {
        return Ok(display_names);
    }

    for serial in serials {
        if let Ok(Some(display_name)) = resolve_device_display_name(serial, mappings).await {
            display_names.insert(serial.clone(), display_name);
        }
    }

    Ok(display_names)
}

async fn resolve_device_display_name(
    serial: &str,
    mappings: &[DeviceNameMapping],
) -> Result<Option<String>, AppError> {
    let device_photo_names = list_device_photo_names(serial).await?;

    for mapping in mappings {
        if device_photo_names.contains(&normalize_lookup_key(&mapping.uuid)) {
            return Ok(Some(mapping.display_name.clone()));
        }
    }

    Ok(None)
}

async fn list_device_photo_names(serial: &str) -> Result<HashSet<String>, AppError> {
    let mut names = HashSet::new();

    for dir in DISPLAY_NAME_IMAGE_DIRS {
        let result = exec_adb_for_device(
            serial,
            &["shell", "find", dir, "-type", "f"],
            DISPLAY_NAME_SCAN_TIMEOUT,
        )
        .await;

        let output = match result {
            Ok(output) => output,
            Err(_) => continue,
        };

        for line in output.lines() {
            let path = line.trim();
            if path.is_empty() {
                continue;
            }

            let file_name = path.rsplit('/').next().unwrap_or(path).trim();
            if file_name.is_empty() {
                continue;
            }

            names.insert(normalize_lookup_key(file_name));
            if let Some(stem) = file_name.rsplit_once('.').map(|(stem, _)| stem) {
                if !stem.is_empty() {
                    names.insert(normalize_lookup_key(stem));
                }
            }
        }
    }

    Ok(names)
}

fn normalize_lookup_key(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn trim_bom(value: &str) -> &str {
    value.strip_prefix('\u{feff}').unwrap_or(value)
}

fn parse_csv_records(content: &str) -> Result<Vec<Vec<String>>, AppError> {
    let mut records = Vec::new();
    let mut record = Vec::new();
    let mut field = String::new();
    let mut chars = content.chars().peekable();
    let mut in_quotes = false;

    while let Some(ch) = chars.next() {
        match ch {
            '"' if in_quotes && chars.peek() == Some(&'"') => {
                field.push('"');
                chars.next();
            }
            '"' => {
                in_quotes = !in_quotes;
            }
            ',' if !in_quotes => {
                record.push(std::mem::take(&mut field));
            }
            '\n' if !in_quotes => {
                record.push(std::mem::take(&mut field));
                records.push(std::mem::take(&mut record));
            }
            '\r' if !in_quotes => {
                if chars.peek() == Some(&'\n') {
                    continue;
                }
                record.push(std::mem::take(&mut field));
                records.push(std::mem::take(&mut record));
            }
            _ => field.push(ch),
        }
    }

    if in_quotes {
        return Err(AppError::parse("CSV のクォートが閉じていません"));
    }

    if !field.is_empty() || !record.is_empty() {
        record.push(field);
        records.push(record);
    }

    Ok(records)
}

pub async fn get_wifi_ip(serial: &str) -> Result<String, AppError> {
    let output = exec_adb_for_device(
        serial,
        &["shell", "ip", "-f", "inet", "addr", "show"],
        STATUS_TIMEOUT,
    )
    .await?;

    parse_wifi_ip_address(&output).ok_or_else(|| AppError::parse("Wi-Fi IP を取得できません"))
}

fn connection_type_for_serial(serial: &str) -> ConnectionType {
    if serial.contains(':') {
        ConnectionType::Wifi
    } else if serial.is_empty() {
        ConnectionType::Unknown
    } else {
        ConnectionType::Usb
    }
}

fn parse_battery_status(output: &str) -> (Option<u8>, Option<bool>, Option<f32>) {
    let mut battery_level = None;
    let mut charging = None;
    let mut temperature_celsius = None;

    for line in output.lines() {
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("level:") {
            battery_level = value.trim().parse::<u8>().ok();
        } else if let Some(value) = trimmed.strip_prefix("status:") {
            charging = value
                .trim()
                .parse::<u8>()
                .ok()
                .map(|status| matches!(status, 2 | 5));
        } else if let Some(value) = trimmed.strip_prefix("temperature:") {
            temperature_celsius = value.trim().parse::<f32>().ok().map(|temp| temp / 10.0);
        }
    }

    (battery_level, charging, temperature_celsius)
}

fn parse_storage_status(output: &str) -> (Option<u64>, Option<u64>) {
    let line = output.lines().rev().find(|line| {
        let trimmed = line.trim();
        !trimmed.is_empty() && !trimmed.starts_with("Filesystem")
    });

    let Some(line) = line else {
        return (None, None);
    };

    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 4 {
        return (None, None);
    }

    let total = parts[1].parse::<u64>().ok().map(|kb| kb * 1024);
    let free = parts[3].parse::<u64>().ok().map(|kb| kb * 1024);
    (total, free)
}

fn parse_wifi_ip_address(output: &str) -> Option<String> {
    let mut current_interface = None;
    let mut wifi_candidates = Vec::new();
    let mut fallback_candidates = Vec::new();

    for line in output.lines() {
        let trimmed = line.trim();
        if !line.starts_with(' ') && !line.starts_with('\t') {
            let mut parts = trimmed.splitn(3, ':');
            let _index = parts.next();
            current_interface = parts.next().map(|name| name.trim().to_string());
            continue;
        }

        if let Some(rest) = trimmed.strip_prefix("inet ") {
            let Some(ip) = rest.split('/').next().map(|value| value.trim()) else {
                continue;
            };
            let Ok(parsed) = ip.parse::<Ipv4Addr>() else {
                continue;
            };
            if !is_usable_ipv4(&parsed) {
                continue;
            }

            let candidate = parsed.to_string();
            if current_interface
                .as_deref()
                .map(is_wifi_interface)
                .unwrap_or(false)
            {
                wifi_candidates.push(candidate);
            } else if is_private_ipv4(&parsed) {
                fallback_candidates.push(candidate);
            }
        }
    }

    wifi_candidates
        .into_iter()
        .next()
        .or_else(|| fallback_candidates.into_iter().next())
}

fn is_wifi_interface(interface: &str) -> bool {
    let base = interface.split('@').next().unwrap_or(interface);
    base.starts_with("wlan")
        || base.starts_with("wifi")
        || base.starts_with("ap")
        || base.starts_with("p2p")
}

fn adb_connect_output_indicates_success(output: &str) -> bool {
    let out = output.trim().to_lowercase();
    (out.contains("connected to") || out.contains("already connected to"))
        && !out.contains("unable")
        && !out.contains("failed")
        && !out.contains("cannot")
}

/// ローカル IP を取得（まずルーティングベース、失敗時は OS コマンドへフォールバック）
async fn get_local_ip() -> Result<String, AppError> {
    if let Ok(ip) = get_local_ip_from_routing() {
        return Ok(ip);
    }

    get_local_ip_from_system().await
}

fn get_local_ip_from_routing() -> Result<String, AppError> {
    let socket = UdpSocket::bind("0.0.0.0:0")?;
    socket.connect("8.8.8.8:80")?;
    let addr = socket.local_addr()?;
    Ok(addr.ip().to_string())
}

async fn get_local_ip_from_system() -> Result<String, AppError> {
    spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        {
            select_preferred_ipv4(run_ipv4_command(
                "powershell",
                &[
                    "-NoProfile",
                    "-Command",
                    "[System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | Where-Object {$_.OperationalStatus -eq 'Up'} | ForEach-Object {$_.GetIPProperties().UnicastAddresses} | Where-Object {$_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and -not $_.Address.IPAddressToString.StartsWith('127.') -and -not $_.Address.IPAddressToString.StartsWith('169.254.')} | ForEach-Object {$_.Address.IPAddressToString}",
                ],
                parse_ipv4_candidates,
            )?)
        }

        #[cfg(not(target_os = "windows"))]
        {
            run_ipv4_command("ip", &["-4", "addr", "show", "scope", "global"], parse_ips_after_inet)
                .or_else(|_| run_ipv4_command("ifconfig", &[], parse_ips_after_inet))
                .and_then(select_preferred_ipv4)
        }
    })
    .await
    .map_err(|e| AppError::parse(format!("ローカル IP 取得タスクが失敗しました: {}", e)))?
}

fn run_ipv4_command(
    command: &str,
    args: &[&str],
    parser: fn(&str) -> Vec<Ipv4Addr>,
) -> Result<Vec<Ipv4Addr>, AppError> {
    let mut std_command = StdCommand::new(command);
    std_command.args(args);
    configure_background_std_command(&mut std_command);

    let output = std_command.output()?;
    if !output.status.success() {
        return Err(AppError::parse(format!(
            "ローカル IP 取得コマンドが失敗しました: {}",
            command
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let candidates = parser(&stdout);
    if candidates.is_empty() {
        return Err(AppError::parse(format!(
            "ローカル IP を抽出できませんでした: {}",
            command
        )));
    }

    Ok(candidates)
}

fn parse_ips_after_inet(output: &str) -> Vec<Ipv4Addr> {
    output
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            let rest = trimmed.split("inet ").nth(1)?;
            let token = rest.split_whitespace().next()?;
            let ip = token.split('/').next().unwrap_or(token);
            ip.parse::<Ipv4Addr>().ok()
        })
        .collect()
}

fn parse_ipv4_candidates(output: &str) -> Vec<Ipv4Addr> {
    output
        .split(|c: char| !(c.is_ascii_digit() || c == '.'))
        .filter_map(|token| token.parse::<Ipv4Addr>().ok())
        .collect()
}

fn select_preferred_ipv4(candidates: Vec<Ipv4Addr>) -> Result<String, AppError> {
    let mut usable = candidates
        .into_iter()
        .filter(is_usable_ipv4)
        .collect::<Vec<_>>();

    usable.sort_by_key(|ip| (!is_private_ipv4(ip), *ip));
    usable.dedup();

    usable
        .into_iter()
        .next()
        .map(|ip| ip.to_string())
        .ok_or_else(|| AppError::parse("利用可能なローカル IP を取得できません"))
}

fn is_usable_ipv4(ip: &Ipv4Addr) -> bool {
    !ip.is_loopback() && !ip.is_link_local() && !ip.is_unspecified()
}

fn is_private_ipv4(ip: &Ipv4Addr) -> bool {
    let octets = ip.octets();
    match octets {
        [10, ..] => true,
        [172, second, ..] if (16..=31).contains(&second) => true,
        [192, 168, ..] => true,
        _ => false,
    }
}

const SCAN_TCP_TIMEOUT_MS: u64 = 500;
const SCAN_ADB_TIMEOUT_MS: u64 = 3000;

/// サブネット内の全 IP に対して ADB 接続を試みる
pub async fn scan_subnet_and_connect(port: Option<u16>) -> Result<SubnetScanResult, AppError> {
    let port = port.unwrap_or(TCPIP_PORT);
    let local_ip = get_local_ip().await?;

    // /24 サブネットのベースを取得
    let parts: Vec<&str> = local_ip.split('.').collect();
    if parts.len() != 4 {
        return Err(AppError::parse(format!("不正な IP アドレス: {local_ip}")));
    }
    let base = format!("{}.{}.{}.", parts[0], parts[1], parts[2]);

    // 全 IP に対して TCP 接続テスト（並列）
    let scan_targets: Vec<String> = (1..=254u8).map(|i| format!("{base}{i}")).collect();
    let mut handles = Vec::with_capacity(scan_targets.len());
    for ip in &scan_targets {
        let ip = ip.clone();
        let port = port;
        handles.push(tokio::spawn(async move {
            let addr = format!("{ip}:{port}");
            let result = timeout(
                Duration::from_millis(SCAN_TCP_TIMEOUT_MS),
                TcpStream::connect(&addr),
            )
            .await;
            match result {
                Ok(Ok(_)) => Some(ip),
                _ => None,
            }
        }));
    }

    let mut reachable_ips = Vec::new();
    for handle in handles {
        if let Ok(Some(ip)) = handle.await {
            reachable_ips.push(ip);
        }
    }

    // 到達可能な IP に adb connect を試行
    let mut connected = Vec::new();
    let mut failed = Vec::new();
    for ip in &reachable_ips {
        let target = format!("{ip}:{port}");
        match exec_adb(&["connect", &target], SCAN_ADB_TIMEOUT_MS).await {
            Ok(output) => {
                if adb_connect_output_indicates_success(&output) {
                    connected.push(target);
                } else {
                    failed.push(target);
                }
            }
            Err(_) => {
                failed.push(target);
            }
        }
    }

    Ok(SubnetScanResult {
        local_ip,
        scanned_count: scan_targets.len(),
        reachable_count: reachable_ips.len(),
        connected,
        failed,
    })
}
