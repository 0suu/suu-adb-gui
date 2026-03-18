# ADB GUI - CLAUDE.md

## プロジェクト概要

ADB (Android Debug Bridge) の GUI ツール。
Tauri v2 + React + TypeScript で構築。mac / Windows 対応を目指す。

## 技術スタック

- **デスクトップ基盤**: Tauri v2
- **フロントエンド**: React 19 + TypeScript + Vite 7
- **状態管理**: Zustand
- **データ取得**: TanStack Query (React Query)
- **バックエンド**: Rust (Tauri commands + Tokio 非同期)
- **ADB 実行**: システムの `adb` コマンドを子プロセスとして実行（将来 sidecar 対応予定）

## ディレクトリ構成

```
src/                          # フロントエンド
├── App.tsx                   # ルートコンポーネント（タブ切替・レイアウト）
├── App.css                   # 全スタイル（ダークテーマ）
├── main.tsx                  # エントリポイント
├── lib/
│   ├── types.ts              # TypeScript 型定義
│   └── api.ts                # Tauri invoke ラッパー
├── stores/
│   ├── deviceStore.ts        # デバイス選択状態 (Zustand)
│   └── logStore.ts           # 操作ログ (Zustand)
└── features/
    ├── devices/DeviceList.tsx # デバイス一覧（左ペイン）
    ├── packages/PackagesTab.tsx # アプリタブ
    ├── media/MediaTab.tsx     # メディアタブ
    └── logs/LogsTab.tsx       # 操作ログタブ

src-tauri/src/                # Rust バックエンド
├── lib.rs                    # Tauri 初期化・コマンド登録
├── main.rs                   # バイナリエントリポイント
├── commands/                 # Tauri コマンドハンドラ (IPC API)
│   ├── devices.rs            # list_devices
│   ├── packages.rs           # get_packages, uninstall_package, run_package
│   ├── install.rs            # install_apk
│   └── media.rs              # list_media_files, pull_media_files
├── services/                 # ビジネスロジック
│   ├── process_manager.rs    # adb プロセス実行・タイムアウト制御
│   ├── device_service.rs     # デバイス列挙・プロパティ取得
│   ├── package_service.rs    # パッケージ一覧・削除・起動
│   ├── install_service.rs    # APK インストール・エラー解析
│   └── media_service.rs      # メディア一覧・pull
├── models/                   # データ型
│   ├── device.rs             # DeviceSummary, DeviceState
│   ├── package.rs            # PackageSummary
│   ├── media.rs              # DeviceMediaFile, MediaKind
│   └── operation.rs          # InstallApkRequest, CommandResult, PullResult 等
└── utils/
    └── error.rs              # AppError, ErrorKind
```

## 開発コマンド

```bash
# 開発サーバー起動（フロントエンド HMR + Rust 自動ビルド）
npx tauri dev

# プロダクションビルド
npx tauri build

# フロントエンドのみビルド
npm run build

# Rust のみ型チェック
cd src-tauri && cargo check
```

## アーキテクチャの要点

### Tauri IPC API（7 コマンド）

| コマンド | 引数 | 返却型 | タイムアウト |
|---------|------|--------|------------|
| `list_devices` | なし | `DeviceSummary[]` | 5秒 |
| `get_packages` | serial | `PackageSummary[]` | 10秒 |
| `uninstall_package` | serial, packageName | `CommandResult` | 15秒 |
| `run_package` | serial, packageName | `CommandResult` | 15秒 |
| `install_apk` | InstallApkRequest | `InstallApkResult` | 120秒 |
| `list_media_files` | serial, filter | `DeviceMediaFile[]` | 20秒 |
| `pull_media_files` | serial, remotePaths, localDir | `PullResult` | 60秒/file |

### デバイス検出

- 3秒間隔のポーリング（React Query `refetchInterval`）
- 将来的に `adb track-devices` ストリーミングに移行予定

### アプリ起動戦略

1. `cmd package resolve-activity --brief` で activity 解決
2. 失敗時は `monkey -p <package> -c LAUNCHER 1` にフォールバック

### メディア対象パス

- `/sdcard/DCIM/`
- `/sdcard/Pictures/`
- `/sdcard/Movies/`

### エラー種別 (ErrorKind)

`AdbNotFound`, `AdbExecution`, `DeviceOffline`, `DeviceUnauthorized`, `Timeout`, `ParseError`, `IoError`

## UI

- ダークテーマ（VSCode 風配色）
- 左ペイン: デバイス一覧
- メインエリア: 3タブ（アプリ / メディア / 操作ログ）
- 日本語 UI

## パーミッション

`src-tauri/capabilities/default.json` で以下を許可:
- `core:default` - 基本 IPC
- `dialog:default`, `dialog:allow-open` - ファイル/フォルダ選択ダイアログ
- `core:event:*` - イベント通知（pull 進捗）
- `opener:default` - 外部リンク

## 注意事項

- adb はシステム PATH から使用。sidecar 同梱は未実装（`process_manager.rs` の `adb_path()` で切替予定）
- 全 API に `serial` を必須引数として持たせている（マルチデバイス対応のため）
- メディアのサイズ・更新日時は optional（端末差分で取得できない場合がある）
- `confirm()` をアンインストール確認に使用中（将来的に Tauri ダイアログに置換推奨）
