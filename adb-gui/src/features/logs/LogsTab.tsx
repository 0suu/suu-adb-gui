import { useLogStore } from "../../stores/logStore";
import { useT } from "../../lib/i18n";

export function LogsTab() {
  const t = useT();
  const logs = useLogStore((s) => s.logs);
  const clearLogs = useLogStore((s) => s.clearLogs);

  return (
    <div className="logs-tab">
      <div className="logs-header">
        <span>{t.logsTitle(logs.length)}</span>
        <button onClick={clearLogs} disabled={logs.length === 0}>
          {t.clear}
        </button>
      </div>
      {logs.length === 0 ? (
        <p className="empty-message">{t.noLogs}</p>
      ) : (
        <ul className="logs-list">
          {logs.map((log) => (
            <li key={log.id} className={`log-item ${log.success ? "success" : "failure"}`}>
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-type">{log.commandType}</span>
              <span className="log-serial">{log.serial}</span>
              <span className="log-detail">{log.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
