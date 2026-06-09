use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeviceState {
    Device,
    Offline,
    Unauthorized,
    Unknown,
}

impl From<&str> for DeviceState {
    fn from(s: &str) -> Self {
        match s.trim() {
            "device" => DeviceState::Device,
            "offline" => DeviceState::Offline,
            "unauthorized" => DeviceState::Unauthorized,
            _ => DeviceState::Unknown,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionType {
    Usb,
    Wifi,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSummary {
    pub serial: String,
    pub state: DeviceState,
    pub model: Option<String>,
    pub android_version: Option<String>,
    pub transport_id: Option<String>,
    pub connection_type: ConnectionType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub serial: String,
    pub connection_type: ConnectionType,
    pub ip_address: Option<String>,
    pub battery_level: Option<u8>,
    pub charging: Option<bool>,
    pub temperature_celsius: Option<f32>,
    pub storage_free_bytes: Option<u64>,
    pub storage_total_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiConnectResult {
    pub success: bool,
    pub raw_output: String,
    pub ip_address: Option<String>,
    pub connected_serial: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotResult {
    pub saved_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceNameMapping {
    pub display_name: String,
    pub uuid: String,
}

pub type DeviceDisplayNameMap = HashMap<String, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubnetScanResult {
    pub local_ip: String,
    pub scanned_count: usize,
    pub reachable_count: usize,
    pub connected: Vec<String>,
    pub failed: Vec<String>,
}
