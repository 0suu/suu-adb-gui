import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clearLogcat, getLogcat } from "../../lib/api";
import { useDeviceStore } from "../../stores/deviceStore";
import { createLog, useLogStore } from "../../stores/logStore";
import { useT } from "../../lib/i18n";

type LogLevelFilter = "all" | "V" | "D" | "I" | "W" | "E" | "F";

type ParsedLogLine = {
  raw: string;
  level: string;
};

function parseLogLine(line: string): ParsedLogLine {
  const match = line.match(
    /^\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+\d+\s+\d+\s+([VDIWEF])\s+/
  );
  return {
    raw: line,
    level: match?.[1] ?? "?",
  };
}

export function LogcatTab() {
  const t = useT();
  const serial = useDeviceStore((s) => s.selectedSerial);
  const addLog = useLogStore((s) => s.addLog);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LogLevelFilter>("all");
  const [paused, setPaused] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["logcat", serial],
    queryFn: () => getLogcat(serial!, 200),
    enabled: !!serial,
    refetchInterval: serial && !paused ? 1500 : false,
  });

  const lines = (data ?? "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parseLogLine)
    .filter((line) => (level === "all" ? true : line.level === level))
    .filter((line) =>
      search.trim()
        ? line.raw.toLowerCase().includes(search.trim().toLowerCase())
        : true
    );

  useEffect(() => {
    if (!paused && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [data, paused]);

  if (!serial) {
    return <div className="tab-placeholder">{t.selectDevice}</div>;
  }

  const handleClear = async () => {
    try {
      await clearLogcat(serial);
      addLog(createLog("logcat-clear", serial, true, t.logcatCleared));
      await refetch();
    } catch (e) {
      addLog(createLog("logcat-clear", serial, false, String(e)));
    }
  };

  return (
    <div className="logcat-tab">
      <div className="logcat-toolbar">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="search-input"
        />
        <div className="filter-group">
          {(["all", "I", "W", "E"] as LogLevelFilter[]).map((item) => (
            <button
              key={item}
              className={`filter-btn ${level === item ? "active" : ""}`}
              onClick={() => setLevel(item)}
            >
              {item === "all" ? t.allLevels : item}
            </button>
          ))}
        </div>
        <button className="btn-secondary" onClick={() => setPaused((value) => !value)}>
          {paused ? t.resume : t.pause}
        </button>
        <button className="btn-secondary" onClick={() => refetch()}>
          {t.refetch}
        </button>
        <button className="btn-danger" onClick={handleClear}>
          {t.clear}
        </button>
      </div>

      {isLoading && <div className="loading">{t.logcatLoading}</div>}
      {error && <div className="error">{t.error}: {String(error)}</div>}

      <div className="logcat-output" ref={outputRef}>
        {lines.length === 0 ? (
          <div className="empty-message">{t.noLogLines}</div>
        ) : (
          lines.map((line, index) => (
            <div
              key={`${index}-${line.raw}`}
              className={`logcat-line level-${line.level.toLowerCase()}`}
            >
              {line.raw}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
