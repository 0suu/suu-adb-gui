import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { listMediaFiles, pullMediaFiles } from "../../lib/api";
import { useDeviceStore } from "../../stores/deviceStore";
import { useLogStore, createLog } from "../../stores/logStore";
import { useT } from "../../lib/i18n";
import type { PullProgress } from "../../lib/types";

type MediaFilter = "all" | "photo" | "video";

export function MediaTab() {
  const t = useT();
  const serial = useDeviceStore((s) => s.selectedSerial);
  const addLog = useLogStore((s) => s.addLog);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState<PullProgress | null>(null);

  const {
    data: files,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["media", serial, filter],
    queryFn: () => listMediaFiles(serial!, filter),
    enabled: !!serial,
  });

  // pull-progress イベント購読
  useEffect(() => {
    const unlisten = listen<PullProgress>("pull-progress", (event) => {
      setProgress(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  if (!serial) {
    return <div className="tab-placeholder">{t.selectDevice}</div>;
  }

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!files) return;
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.path)));
    }
  };

  const handlePull = async () => {
    if (selected.size === 0) return;
    const dir = await open({ directory: true });
    if (!dir) return;

    setPulling(true);
    setProgress(null);
    try {
      const result = await pullMediaFiles(serial, [...selected], dir);
      addLog(
        createLog(
          "pull",
          serial,
          result.success,
          t.pullComplete(result.files.length, result.failed.length)
        )
      );
      setSelected(new Set());
    } catch (e) {
      addLog(createLog("pull", serial, false, String(e)));
    } finally {
      setPulling(false);
      setProgress(null);
    }
  };

  return (
    <div className="media-tab">
      <div className="media-toolbar">
        <div className="filter-group">
          {(["all", "photo", "video"] as MediaFilter[]).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => {
                setFilter(f);
                setSelected(new Set());
              }}
            >
              {f === "all" ? t.filterAll : f === "photo" ? t.filterPhoto : t.filterVideo}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()}>{t.reload}</button>
        <button onClick={selectAll}>
          {files && selected.size === files.length ? t.deselectAll : t.selectAll}
        </button>
        <button
          onClick={handlePull}
          disabled={pulling || selected.size === 0}
        >
          {pulling
            ? progress
              ? t.transferringProgress(progress.current, progress.total)
              : t.transferring
            : t.pull(selected.size)}
        </button>
      </div>

      {isLoading && <div className="loading">{t.loading}</div>}
      {error && <div className="error">{t.error}: {String(error)}</div>}

      {pulling && progress && (
        <div className="progress-bar">
          <div className="progress-info">
            {progress.currentFile} ({progress.current}/{progress.total})
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="media-list">
        {(files ?? []).map((file) => (
          <div
            key={file.path}
            className={`media-item ${selected.has(file.path) ? "selected" : ""}`}
            onClick={() => toggleSelect(file.path)}
          >
            <input
              type="checkbox"
              checked={selected.has(file.path)}
              onClick={(event) => event.stopPropagation()}
              onChange={() => toggleSelect(file.path)}
            />
            <span className={`media-kind ${file.kind}`}>
              {file.kind === "photo" ? t.photo : t.video}
            </span>
            <span className="media-name">{file.name}</span>
            <span className="media-path">{file.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
