import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useT } from "../../lib/i18n";

type State =
  | { kind: "idle" }
  | { kind: "available"; update: Update }
  | { kind: "downloading"; percent: number }
  | { kind: "installing" }
  | { kind: "restart" };

export function UpdateChecker() {
  const t = useT();
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await check();
        if (update?.available) {
          setState({ kind: "available", update });
        }
      } catch {
        // サイレント失敗（ネットワーク未接続など）
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (state.kind === "idle") return null;

  const handleUpdate = async () => {
    if (state.kind !== "available") return;
    const { update } = state;

    try {
      let downloaded = 0;
      let totalBytes = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? 0;
          setState({ kind: "downloading", percent: 0 });
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          const total = totalBytes || downloaded || 1;
          const percent = Math.round((downloaded / total) * 100);
          setState({ kind: "downloading", percent });
        } else if (event.event === "Finished") {
          setState({ kind: "installing" });
        }
      });
      setState({ kind: "restart" });
    } catch {
      setState({ kind: "idle" });
    }
  };

  const handleRelaunch = async () => {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  };

  return (
    <div className="update-banner">
      {state.kind === "available" && (
        <>
          <span className="update-banner-text">
            {t.updateAvailable(state.update.version)}
          </span>
          <button className="update-banner-btn primary" onClick={handleUpdate}>
            {t.updateNow}
          </button>
          <button className="update-banner-btn" onClick={() => setState({ kind: "idle" })}>
            {t.updateLater}
          </button>
        </>
      )}
      {state.kind === "downloading" && (
        <>
          <span className="update-banner-text">
            {t.updateDownloading(state.percent)}
          </span>
          <div className="update-progress-bar">
            <div className="update-progress-fill" style={{ width: `${state.percent}%` }} />
          </div>
        </>
      )}
      {state.kind === "installing" && (
        <span className="update-banner-text">{t.updateInstalling}</span>
      )}
      {state.kind === "restart" && (
        <>
          <span className="update-banner-text">{t.updateInstalling}</span>
          <button className="update-banner-btn primary" onClick={handleRelaunch}>
            {t.updateRestart}
          </button>
        </>
      )}
    </div>
  );
}
