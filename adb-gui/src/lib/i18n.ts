import { useLangStore } from "../stores/langStore";

type Translations = {
  // DeviceList
  deviceListLoading: string;
  deviceListError: string;
  deviceListEmpty: string;
  deviceListEmptyHint: string;
  deviceListTitle: string;
  loadDeviceNamesCsv: string;
  deviceNamesCsvLoaded: (count: number) => string;
  deviceNamesCsvLoadFailed: string;
  matchingDeviceNames: string;
  stateDevice: string;
  stateOffline: string;
  stateUnauthorized: string;
  stateUnknown: string;
  connectionWifi: string;
  connectionUsb: string;
  connectionUnknown: string;
  // Common
  selectDevice: string;
  // ConnectionPanel
  connectionPanelTitle: string;
  // DeviceHeader
  noDeviceSelected: string;
  selectAdbDevice: string;
  disconnected: string;
  statusBattery: string;
  statusCharging: string;
  statusOnBattery: string;
  statusTemperature: string;
  statusFree: string;
  statusIp: string;
  noWifi: string;
  connect: string;
  disconnect: string;
  usbToWifi: string;
  scanning: string;
  subnetScan: string;
  screenshot: string;
  saving: string;
  terminal: string;
  subnetScanTitle: string;
  wifiEnableReasonNoDevice: string;
  wifiEnableReasonNotUsb: string;
  wifiEnableReasonNoWifi: string;
  wifiEnableReasonOk: string;
  wifiNoIp: string;
  connectedTo: (target: string) => string;
  disconnectedFrom: (serial: string) => string;
  screenshotSaved: (path: string) => string;
  subnetScanFound: (count: number, list: string) => string;
  subnetScanNotFound: (reachable: number) => string;
  // App tabs
  tabPackages: string;
  tabMedia: string;
  tabLogcat: string;
  tabLogs: string;
  // PackagesTab
  installing: string;
  installApk: string;
  replaceExisting: string;
  searchPackages: string;
  loading: string;
  error: string;
  installSuccess: (path: string) => string;
  installFail: (reason: string) => string;
  uninstallSuccess: (pkg: string) => string;
  uninstallFail: (reason: string) => string;
  runSuccess: (pkg: string) => string;
  runFail: (reason: string) => string;
  uninstallConfirm: (pkg: string) => string;
  run: string;
  uninstall: string;
  // MediaTab
  filterAll: string;
  filterPhoto: string;
  filterVideo: string;
  reload: string;
  deselectAll: string;
  selectAll: string;
  transferring: string;
  transferringProgress: (current: number, total: number) => string;
  pull: (count: number) => string;
  pullComplete: (success: number, failed: number) => string;
  photo: string;
  video: string;
  // LogsTab
  logsTitle: (count: number) => string;
  clear: string;
  noLogs: string;
  // LogcatTab
  searchPlaceholder: string;
  allLevels: string;
  resume: string;
  pause: string;
  refetch: string;
  logcatLoading: string;
  noLogLines: string;
  logcatCleared: string;
  // ShellDialog
  shellNoDevice: string;
  shellDevices: (count: number) => string;
  shellTitle: string;
  shellHintLine1: string;
  shellHintLine2: string;
  shellRunning: string;
  shellNoOutput: string;
  shellNoDevicePrompt: string;
  // Updater
  updateAvailable: (version: string) => string;
  updateNow: string;
  updateLater: string;
  updateDownloading: (percent: number) => string;
  updateInstalling: string;
  updateRestart: string;
};

const ja: Translations = {
  // Common
  selectDevice: "デバイスを選択してください",
  // DeviceList
  deviceListLoading: "デバイス検出中...",
  deviceListError: "デバイス取得エラー",
  deviceListEmpty: "デバイスが見つかりません",
  deviceListEmptyHint: "USB デバッグを有効にして接続してください",
  deviceListTitle: "デバイス",
  loadDeviceNamesCsv: "CSV読込",
  deviceNamesCsvLoaded: (count) => `${count} 件の名前を読み込みました`,
  deviceNamesCsvLoadFailed: "CSV 読み込み失敗",
  matchingDeviceNames: "名前照合中...",
  stateDevice: "接続中",
  stateOffline: "オフライン",
  stateUnauthorized: "未認証",
  stateUnknown: "不明",
  connectionWifi: "Wi-Fi",
  connectionUsb: "USB",
  connectionUnknown: "不明",
  // ConnectionPanel
  connectionPanelTitle: "Wi-Fi 接続",
  // DeviceHeader
  noDeviceSelected: "デバイス未選択",
  selectAdbDevice: "ADB デバイスを選択してください",
  disconnected: "未接続",
  statusBattery: "電池",
  statusCharging: "充電",
  statusOnBattery: "バッテリー動作",
  statusTemperature: "温度",
  statusFree: "空き",
  statusIp: "IP",
  noWifi: "Wi-Fi未接続",
  connect: "接続",
  disconnect: "切断",
  usbToWifi: "USB→Wi-Fi",
  scanning: "スキャン中...",
  subnetScan: "スキャン",
  screenshot: "スクショ",
  saving: "保存中...",
  terminal: "ターミナル",
  subnetScanTitle: "同じサブネットの全 IP に ADB 接続を試みます",
  wifiEnableReasonNoDevice: "デバイスを選択してください",
  wifiEnableReasonNotUsb: "USB 接続中の端末でのみ使えます",
  wifiEnableReasonNoWifi: "端末が Wi-Fi に接続されていません",
  wifiEnableReasonOk: "USB 接続から Wi-Fi ADB に切り替えます",
  wifiNoIp: "Wi-Fi IP を取得できませんでした",
  connectedTo: (target) => `${target} に接続しました`,
  disconnectedFrom: (serial) => `${serial} を切断しました`,
  screenshotSaved: (path) => `保存: ${path}`,
  subnetScanFound: (count, list) => `${count} 台接続: ${list}`,
  subnetScanNotFound: (reachable) => `接続できるデバイスが見つかりませんでした (到達可能: ${reachable})`,
  // App tabs
  tabPackages: "アプリ",
  tabMedia: "メディア",
  tabLogcat: "logcat",
  tabLogs: "操作ログ",
  // PackagesTab
  installing: "インストール中...",
  installApk: "APK インストール",
  replaceExisting: "上書き",
  searchPackages: "パッケージ検索...",
  loading: "読み込み中...",
  error: "エラー",
  installSuccess: (path) => `インストール成功: ${path}`,
  installFail: (reason) => `インストール失敗: ${reason}`,
  uninstallSuccess: (pkg) => `削除成功: ${pkg}`,
  uninstallFail: (reason) => `削除失敗: ${reason}`,
  runSuccess: (pkg) => `起動成功: ${pkg}`,
  runFail: (reason) => `起動失敗: ${reason}`,
  uninstallConfirm: (pkg) => `${pkg} をアンインストールしますか？`,
  run: "起動",
  uninstall: "削除",
  // MediaTab
  filterAll: "すべて",
  filterPhoto: "写真",
  filterVideo: "動画",
  reload: "再読み込み",
  deselectAll: "全解除",
  selectAll: "全選択",
  transferring: "転送中...",
  transferringProgress: (current, total) => `${current}/${total} 転送中...`,
  pull: (count) => `取り出し (${count})`,
  pullComplete: (success, failed) => `取得完了: 成功 ${success} / 失敗 ${failed}`,
  photo: "写真",
  video: "動画",
  // LogsTab
  logsTitle: (count) => `操作ログ (${count}件)`,
  clear: "クリア",
  noLogs: "ログはありません",
  // LogcatTab
  searchPlaceholder: "検索...",
  allLevels: "全レベル",
  resume: "再開",
  pause: "停止",
  refetch: "再取得",
  logcatLoading: "logcat 読み込み中...",
  noLogLines: "表示できるログがありません",
  logcatCleared: "logcat をクリアしました",
  // ShellDialog
  shellNoDevice: "デバイスが選択されていません",
  shellDevices: (count) => `${count} デバイス`,
  shellTitle: "ターミナル",
  shellHintLine1: "adb コマンドの引数を入力してください（例: shell getprop ro.product.model）",
  shellHintLine2: "↑↓ 履歴　Ctrl+L クリア　Esc 閉じる",
  shellRunning: "実行中…",
  shellNoOutput: "(出力なし)",
  shellNoDevicePrompt: "adb (デバイス未選択)",
  // Updater
  updateAvailable: (version) => `新しいバージョン ${version} が利用可能です`,
  updateNow: "今すぐ更新",
  updateLater: "後で",
  updateDownloading: (percent) => `ダウンロード中... ${percent}%`,
  updateInstalling: "インストール中...",
  updateRestart: "再起動して適用",
};

const en: Translations = {
  // Common
  selectDevice: "Please select a device",
  // DeviceList
  deviceListLoading: "Detecting devices...",
  deviceListError: "Failed to get devices",
  deviceListEmpty: "No devices found",
  deviceListEmptyHint: "Enable USB debugging and connect your device",
  deviceListTitle: "Devices",
  loadDeviceNamesCsv: "Load CSV",
  deviceNamesCsvLoaded: (count) => `Loaded ${count} names`,
  deviceNamesCsvLoadFailed: "Failed to load CSV",
  matchingDeviceNames: "Matching names...",
  stateDevice: "Connected",
  stateOffline: "Offline",
  stateUnauthorized: "Unauthorized",
  stateUnknown: "Unknown",
  connectionWifi: "Wi-Fi",
  connectionUsb: "USB",
  connectionUnknown: "Unknown",
  // ConnectionPanel
  connectionPanelTitle: "Wi-Fi Connect",
  // DeviceHeader
  noDeviceSelected: "No device selected",
  selectAdbDevice: "Select an ADB device",
  disconnected: "Disconnected",
  statusBattery: "Battery",
  statusCharging: "Charging",
  statusOnBattery: "On Battery",
  statusTemperature: "Temp",
  statusFree: "Free",
  statusIp: "IP",
  noWifi: "Wi-Fi not connected",
  connect: "Connect",
  disconnect: "Disconnect",
  usbToWifi: "USB→Wi-Fi",
  scanning: "Scanning...",
  subnetScan: "Scan",
  screenshot: "Screenshot",
  saving: "Saving...",
  terminal: "Terminal",
  subnetScanTitle: "Try ADB connect to all IPs on the same subnet",
  wifiEnableReasonNoDevice: "Please select a device",
  wifiEnableReasonNotUsb: "Only available for USB-connected devices",
  wifiEnableReasonNoWifi: "Device is not connected to Wi-Fi",
  wifiEnableReasonOk: "Switch from USB to Wi-Fi ADB",
  wifiNoIp: "Could not get Wi-Fi IP",
  connectedTo: (target) => `Connected to ${target}`,
  disconnectedFrom: (serial) => `Disconnected ${serial}`,
  screenshotSaved: (path) => `Saved: ${path}`,
  subnetScanFound: (count, list) => `Connected ${count} device(s): ${list}`,
  subnetScanNotFound: (reachable) => `No connectable devices found (reachable: ${reachable})`,
  // App tabs
  tabPackages: "Apps",
  tabMedia: "Media",
  tabLogcat: "Logcat",
  tabLogs: "Logs",
  // PackagesTab
  installing: "Installing...",
  installApk: "Install APK",
  replaceExisting: "Replace existing",
  searchPackages: "Search packages...",
  loading: "Loading...",
  error: "Error",
  installSuccess: (path) => `Install success: ${path}`,
  installFail: (reason) => `Install failed: ${reason}`,
  uninstallSuccess: (pkg) => `Uninstalled: ${pkg}`,
  uninstallFail: (reason) => `Uninstall failed: ${reason}`,
  runSuccess: (pkg) => `Launched: ${pkg}`,
  runFail: (reason) => `Launch failed: ${reason}`,
  uninstallConfirm: (pkg) => `Uninstall ${pkg}?`,
  run: "Launch",
  uninstall: "Uninstall",
  // MediaTab
  filterAll: "All",
  filterPhoto: "Photos",
  filterVideo: "Videos",
  reload: "Reload",
  deselectAll: "Deselect All",
  selectAll: "Select All",
  transferring: "Transferring...",
  transferringProgress: (current, total) => `${current}/${total} transferring...`,
  pull: (count) => `Pull (${count})`,
  pullComplete: (success, failed) => `Done: ${success} success / ${failed} failed`,
  photo: "Photo",
  video: "Video",
  // LogsTab
  logsTitle: (count) => `Logs (${count})`,
  clear: "Clear",
  noLogs: "No logs",
  // LogcatTab
  searchPlaceholder: "Search...",
  allLevels: "All",
  resume: "Resume",
  pause: "Pause",
  refetch: "Refresh",
  logcatLoading: "Loading logcat...",
  noLogLines: "No log lines to display",
  logcatCleared: "Logcat cleared",
  // ShellDialog
  shellNoDevice: "No device selected",
  shellDevices: (count) => `${count} devices`,
  shellTitle: "Terminal",
  shellHintLine1: "Enter adb command arguments (e.g. shell getprop ro.product.model)",
  shellHintLine2: "↑↓ History  Ctrl+L Clear  Esc Close",
  shellRunning: "Running…",
  shellNoOutput: "(no output)",
  shellNoDevicePrompt: "adb (no device)",
  // Updater
  updateAvailable: (version) => `New version ${version} is available`,
  updateNow: "Update now",
  updateLater: "Later",
  updateDownloading: (percent) => `Downloading... ${percent}%`,
  updateInstalling: "Installing...",
  updateRestart: "Restart to apply",
};

const translations: Record<string, Translations> = { ja, en };

export function useT(): Translations {
  const lang = useLangStore((s) => s.lang);
  return translations[lang];
}
