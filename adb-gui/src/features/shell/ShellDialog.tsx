import { useEffect, useRef, useState } from "react";
import { useDeviceStore } from "../../stores/deviceStore";
import { runAdbCommand } from "../../lib/api";
import { useT } from "../../lib/i18n";

type OutputLine = {
  id: number;
  type: "command" | "stdout" | "error" | "info";
  text: string;
};

type Props = {
  onClose: () => void;
};

export function ShellDialog({ onClose }: Props) {
  const t = useT();
  const terminalSerials = useDeviceStore((s) => s.terminalSerials);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const addLine = (type: OutputLine["type"], text: string) => {
    setOutput((prev) => [...prev, { id: lineIdRef.current++, type, text }]);
  };

  const runCommand = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (terminalSerials.length === 0) {
      addLine("error", t.shellNoDevice);
      return;
    }

    const args = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const unquoted = args.map((a) =>
      (a.startsWith('"') && a.endsWith('"')) ||
      (a.startsWith("'") && a.endsWith("'"))
        ? a.slice(1, -1)
        : a
    );

    const multiDevice = terminalSerials.length > 1;
    if (multiDevice) {
      addLine("command", `$ ${trimmed}  [→ ${t.shellDevices(terminalSerials.length)}]`);
    } else {
      addLine("command", `$ adb -s ${terminalSerials[0]} ${trimmed}`);
    }

    setHistory((prev) => [trimmed, ...prev.slice(0, 99)]);
    setHistoryIndex(-1);
    setInput("");
    setRunning(true);

    try {
      const results = await Promise.all(
        terminalSerials.map(async (serial) => {
          try {
            const result = await runAdbCommand(serial, unquoted);
            return { serial, result, error: null };
          } catch (e) {
            return { serial, result: null, error: String(e) };
          }
        })
      );

      for (const { serial, result, error } of results) {
        const prefix = multiDevice ? `[${serial}] ` : "";
        if (error) {
          addLine("error", prefix + error);
        } else if (result) {
          const text = result.rawOutput.trimEnd();
          if (text) {
            addLine(result.success ? "stdout" : "error", prefix + text);
          } else if (result.success) {
            addLine("info", prefix + t.shellNoOutput);
          }
        }
      }
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand();
    } else if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(next);
      setInput(history[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIndex - 1, -1);
      setHistoryIndex(next);
      setInput(next === -1 ? "" : (history[next] ?? ""));
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setOutput([]);
    }
  };

  const targetLabel =
    terminalSerials.length === 0
      ? "—"
      : terminalSerials.length === 1
        ? terminalSerials[0]
        : t.shellDevices(terminalSerials.length);

  const prompt =
    terminalSerials.length === 0
      ? t.shellNoDevicePrompt
      : terminalSerials.length === 1
        ? `adb -s ${terminalSerials[0]}`
        : t.shellDevices(terminalSerials.length);

  return (
    <div className="shell-overlay" onClick={onClose}>
      <div className="shell-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shell-titlebar">
          <span className="shell-title">{t.shellTitle}</span>
          <span className="shell-device">{targetLabel}</span>
          <button className="shell-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="shell-output" ref={outputRef}>
          {output.length === 0 && (
            <div className="shell-hint">
              {t.shellHintLine1}<br />
              {t.shellHintLine2}
            </div>
          )}
          {output.map((line) => (
            <div key={line.id} className={`shell-line shell-line-${line.type}`}>
              {line.text}
            </div>
          ))}
          {running && <div className="shell-line shell-line-info">{t.shellRunning}</div>}
        </div>
        <div className="shell-input-row">
          <span className="shell-prompt">{prompt}&nbsp;</span>
          <input
            ref={inputRef}
            className="shell-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
