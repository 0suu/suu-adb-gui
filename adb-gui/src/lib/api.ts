import { invoke } from "@tauri-apps/api/core";
import type {
  DeviceStatus,
  DeviceSummary,
  PackageSummary,
  CommandResult,
  InstallApkRequest,
  InstallApkResult,
  DeviceMediaFile,
  PullResult,
  ScreenshotResult,
  SubnetScanResult,
  WifiConnectResult,
} from "./types";

// デバイス
export const listDevices = () => invoke<DeviceSummary[]>("list_devices");
export const getDeviceStatus = (serial: string) =>
  invoke<DeviceStatus>("get_device_status", { serial });
export const enableAdbOverTcpip = (serial: string) =>
  invoke<WifiConnectResult>("enable_adb_over_tcpip", { serial });
export const connectWifiDevice = (target: string) =>
  invoke<WifiConnectResult>("connect_wifi_device", { target });
export const disconnectWifiDevice = (target: string) =>
  invoke<string>("disconnect_wifi_device", { target });
export const scanSubnet = (port?: number) =>
  invoke<SubnetScanResult>("scan_subnet", { port: port ?? null });
export const captureScreenshot = (serial: string, localPath: string) =>
  invoke<ScreenshotResult>("capture_screenshot", { serial, localPath });

// パッケージ
export const getPackages = (serial: string) =>
  invoke<PackageSummary[]>("get_packages", { serial });

export const uninstallPackage = (serial: string, packageName: string) =>
  invoke<CommandResult>("uninstall_package", { serial, packageName });

export const runPackage = (serial: string, packageName: string) =>
  invoke<CommandResult>("run_package", { serial, packageName });

// インストール
export const installApk = (req: InstallApkRequest) =>
  invoke<InstallApkResult>("install_apk", { req });

// 任意コマンド
export const runAdbCommand = (serial: string, args: string[]) =>
  invoke<CommandResult>("run_adb_command", { serial, args });

// logcat
export const getLogcat = (serial: string, lines = 200) =>
  invoke<string>("get_logcat", { serial, lines });
export const clearLogcat = (serial: string) =>
  invoke<string>("clear_logcat", { serial });

// メディア
export const listMediaFiles = (serial: string, filter: string) =>
  invoke<DeviceMediaFile[]>("list_media_files", { serial, filter });

export const pullMediaFiles = (
  serial: string,
  remotePaths: string[],
  localDir: string
) => invoke<PullResult>("pull_media_files", { serial, remotePaths, localDir });
