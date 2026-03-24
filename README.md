# ADB GUI Tool

<img width="1277" height="795" alt="image" src="https://github.com/user-attachments/assets/0e3c4e59-8404-4f98-87c2-a4d82f54b08c" />


macOS / Windows で動作する ADB (Android Debug Bridge) の GUI ツール。

USB または WiFi で接続した Android 端末に対して、APK インストール・アプリ管理・写真や動画の取り出し・logcat 閲覧などをワンクリックで行えます。

## 機能

- **デバイス管理** — 接続中の Android 端末を自動検出・表示（バッテリー・温度・ストレージ等の詳細情報）
- **WiFi 接続** — IP アドレスを指定してワイヤレス接続
- **APK インストール** — ファイル選択で APK をインストール（上書きオプション対応）
- **アプリ一覧** — ユーザーアプリの一覧表示・検索
- **アプリ起動 / 削除** — ワンクリックで起動、確認付きでアンインストール
- **メディア取り出し** — 端末内の写真・動画を PC にコピー（複数選択・進捗表示対応）
- **Logcat** — デバイスログのリアルタイム閲覧
- **ADB シェル** — GUI 上からシェルコマンドを実行
- **操作ログ** — 全操作の結果を記録・閲覧
- **自動アップデート** — 新バージョンの通知と更新
- **日本語 / 英語 切替** — UI 言語をワンクリックで変更

## 前提条件

- [ADB](https://developer.android.com/tools/adb) がインストールされていること

### ADB のインストール

```bash
# macOS (Homebrew)
brew install android-platform-tools

# Windows (Scoop)
scoop install adb

# または Android SDK Platform-Tools を手動ダウンロード
```

アプリは `adb` を次の順で検出します。

- `ANDROID_HOME` / `ANDROID_SDK_ROOT` 配下の `platform-tools`
- Windows: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
- macOS: `~/Library/Android/sdk/platform-tools/adb`
- そのほか既知のインストール先
- 最後にシステム PATH 上の `adb`

## 使い方

1. Android 端末の **USB デバッグ** を有効にする
2. USB ケーブルで PC に接続する（WiFi 接続も可）
3. 端末に表示される「USB デバッグを許可しますか？」で **OK** を押す
4. ADB GUI Tool を起動すると、左ペインにデバイスが表示される

### アプリタブ

- **APK インストール**: 「APK インストール」ボタンから `.apk` ファイルを選択
- **アプリ起動**: 一覧の「起動」ボタンをクリック
- **アプリ削除**: 一覧の「削除」ボタンをクリック（確認ダイアログあり）

### メディアタブ

- 写真 / 動画 / すべて でフィルタ切替
- ファイルをクリックで選択（複数選択可）
- 「全選択」で一括選択
- 「取り出し」で保存先フォルダを選んで PC にコピー

### Logcat タブ

- デバイスログをリアルタイムで閲覧

### シェル

- ADB シェルコマンドを直接実行

## トラブルシューティング

### デバイスが表示されない

1. USB デバッグが有効になっているか確認
2. 端末の RSA 承認ダイアログを確認
3. ケーブルを差し直す
4. ターミナルで `adb devices` を実行して確認

### unauthorized と表示される

端末のロック画面を解除し、「USB デバッグを許可しますか？」のダイアログで OK を押してください。

### インストールが失敗する

- **VERSION_DOWNGRADE**: 古いバージョンの APK です。「上書きインストール」を有効にしてください。
- **UPDATE_INCOMPATIBLE**: 署名が異なります。既存アプリを削除してからインストールしてください。
- **INSUFFICIENT_STORAGE**: 端末のストレージが不足しています。

## 開発

### 前提条件（開発用）

- [Node.js](https://nodejs.org/) v18 以上
- [Rust](https://rustup.rs/) (stable)

### セットアップ

```bash
cd adb-gui
npm install
npx tauri dev
```

### ビルド

```bash
npx tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

- macOS: `.app` / `.dmg`
- Windows: `.msi` / `.exe`

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップ基盤 | [Tauri v2](https://tauri.app/) |
| フロントエンド | React 19 + TypeScript |
| 状態管理 | [Zustand](https://github.com/pmndrs/zustand) |
| データ取得 | [TanStack Query](https://tanstack.com/query) |
| バックエンド | Rust + Tokio |
| ビルドツール | Vite 7 |

## 既知の制限事項

- ADB はシステムにインストール済みである必要があります（アプリには同梱していません）
- メディア取り出しの対象は `/sdcard/DCIM/`、`/sdcard/Pictures/`、`/sdcard/Movies/` です
- 操作ログはアプリ終了時にクリアされます

## ライセンス

ISC
