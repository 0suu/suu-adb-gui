import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { captureScreenshot, getDeviceStatus } from "../../lib/api";
import { useDeviceStore } from "../../stores/deviceStore";
import { createLog, useLogStore } from "../../stores/logStore";
import { useT } from "../../lib/i18n";

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "—";
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(1)} GB`;
}

function defaultScreenshotName(serial: string) {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `screenshot-${serial}-${iso}.png`;
}

export function DeviceHeader() {
  const t = useT();
  const devices = useDeviceStore((s) => s.devices);
  const serial = useDeviceStore((s) => s.selectedSerial);
  const addLog = useLogStore((s) => s.addLog);
  const [screenshotBusy, setScreenshotBusy] = useState(false);

  const selectedDevice = devices.find((d) => d.serial === serial) ?? null;
  const { data: status } = useQuery({
    queryKey: ["device-status", serial],
    queryFn: () => getDeviceStatus(serial!),
    enabled: !!serial,
    refetchInterval: 5000,
  });

  const handleScreenshot = async () => {
    if (!serial) return;
    const path = await save({
      defaultPath: defaultScreenshotName(serial.replace(/[:/\\]/g, "_")),
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (!path) return;
    setScreenshotBusy(true);
    try {
      const result = await captureScreenshot(serial, path);
      addLog(createLog("screenshot", serial, true, t.screenshotSaved(result.savedPath)));
    } catch (error) {
      addLog(createLog("screenshot", serial, false, String(error)));
    } finally {
      setScreenshotBusy(false);
    }
  };

  return (
    <div className="device-header">
      <div className="device-header-summary">
        <div className="device-header-title">
          {selectedDevice ? selectedDevice.model || serial : t.noDeviceSelected}
        </div>
        <div className="device-header-serial">{serial ?? t.selectAdbDevice}</div>
      </div>

      <div className="device-status-chips">
        <span className="status-chip">
          {status?.connectionType === "wifi"
            ? t.connectionWifi
            : status?.connectionType === "usb"
              ? t.connectionUsb
              : t.disconnected}
        </span>
        <span className="status-chip">
          {t.statusBattery} {status?.batteryLevel != null ? `${status.batteryLevel}%` : "—"}
        </span>
        <span className="status-chip">
          {status?.charging == null ? `${t.statusCharging} —` : status.charging ? t.statusCharging : t.statusOnBattery}
        </span>
        <span className="status-chip">
          {t.statusTemperature} {status?.temperatureCelsius != null ? `${status.temperatureCelsius.toFixed(1)}C` : "—"}
        </span>
        <span className="status-chip">
          {t.statusFree} {formatBytes(status?.storageFreeBytes)}
        </span>
        <span className="status-chip">
          {t.statusIp} {status?.ipAddress ?? t.noWifi}
        </span>
      </div>

      <div className="device-header-actions">
        <button
          className="btn-icon"
          onClick={handleScreenshot}
          disabled={!serial || screenshotBusy}
          title={screenshotBusy ? t.saving : t.screenshot}
          aria-label={screenshotBusy ? t.saving : t.screenshot}
        >
          {screenshotBusy ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
