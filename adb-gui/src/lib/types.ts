// デバイス
export type DeviceState = "device" | "offline" | "unauthorized" | "unknown";
export type ConnectionType = "usb" | "wifi" | "unknown";

export type DeviceSummary = {
  serial: string;
  state: DeviceState;
  model?: string;
  androidVersion?: string;
  transportId?: string;
  connectionType: ConnectionType;
};

export type DeviceStatus = {
  serial: string;
  connectionType: ConnectionType;
  ipAddress?: string;
  batteryLevel?: number;
  charging?: boolean;
  temperatureCelsius?: number;
  storageFreeBytes?: number;
  storageTotalBytes?: number;
};

export type WifiConnectResult = {
  success: boolean;
  rawOutput: string;
  ipAddress?: string;
  connectedSerial?: string;
};

export type ScreenshotResult = {
  savedPath: string;
};

export type SubnetScanResult = {
  localIp: string;
  scannedCount: number;
  reachableCount: number;
  connected: string[];
  failed: string[];
};

// パッケージ
export type PackageSummary = {
  packageName: string;
  label?: string;
  launchableActivity?: string;
};

// メディア
export type MediaKind = "photo" | "video";

export type DeviceMediaFile = {
  path: string;
  name: string;
  kind: MediaKind;
  sizeBytes?: number;
  modifiedAt?: string;
};

// 操作結果
export type CommandResult = {
  success: boolean;
  rawOutput: string;
};

export type InstallApkRequest = {
  serial: string;
  apkPath: string;
  replaceExisting: boolean;
};

export type InstallApkResult = {
  success: boolean;
  rawOutput: string;
  failureReason?: string;
};

export type PullResult = {
  success: boolean;
  files: string[];
  failed: string[];
};

export type PullProgress = {
  current: number;
  total: number;
  currentFile: string;
  succeeded: number;
  failed: number;
};

// 操作ログ
export type OperationLog = {
  id: string;
  commandType: string;
  serial: string;
  timestamp: string;
  success: boolean;
  detail: string;
};
