import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { listDevices } from "../../lib/api";
import { useDeviceStore } from "../../stores/deviceStore";
import { useT } from "../../lib/i18n";
import type { DeviceSummary } from "../../lib/types";

const stateColor: Record<string, string> = {
  device: "#4caf50",
  offline: "#9e9e9e",
  unauthorized: "#ff9800",
  unknown: "#9e9e9e",
};

export function DeviceList() {
  const t = useT();
  const { devices, setDevices, selectedSerial, selectDevice, terminalSerials, toggleTerminalSerial } =
    useDeviceStore();
  const missingSelectionCountRef = useRef(0);

  const stateLabel: Record<string, string> = {
    device: t.stateDevice,
    offline: t.stateOffline,
    unauthorized: t.stateUnauthorized,
    unknown: t.stateUnknown,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (data) {
      setDevices(data);
      if (selectedSerial) {
        if (data.some((d) => d.serial === selectedSerial)) {
          missingSelectionCountRef.current = 0;
        } else {
          missingSelectionCountRef.current += 1;
          if (missingSelectionCountRef.current >= 2) {
            missingSelectionCountRef.current = 0;
            selectDevice(null);
          }
        }
      } else {
        missingSelectionCountRef.current = 0;
      }
      if (!selectedSerial && data.length === 1) {
        selectDevice(data[0].serial);
      }
    }
  }, [data, selectedSerial, setDevices, selectDevice]);

  const handleClick = (e: React.MouseEvent, serial: string) => {
    if (e.ctrlKey && selectedSerial) {
      toggleTerminalSerial(serial);
    } else {
      selectDevice(serial);
    }
  };

  if (isLoading && devices.length === 0) {
    return <div className="device-list-loading">{t.deviceListLoading}</div>;
  }

  if (error) {
    return (
      <div className="device-list-error">
        <p>{t.deviceListError}</p>
        <small>{String(error)}</small>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="device-list-empty">
        <p>{t.deviceListEmpty}</p>
        <small>{t.deviceListEmptyHint}</small>
      </div>
    );
  }

  return (
    <div className="device-list">
      <h3>{t.deviceListTitle}</h3>
      <div className="device-list-grid">
        {devices.map((device: DeviceSummary) => {
          const isPrimary = selectedSerial === device.serial;
          const isTerminalTarget = terminalSerials.includes(device.serial);
          const className = [
            "device-item",
            isPrimary ? "selected" : "",
            !isPrimary && isTerminalTarget ? "terminal-target" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={device.serial}
              className={className}
              onClick={(e) => handleClick(e, device.serial)}
            >
              <div className="device-status">
                <span
                  className="status-dot"
                  style={{ backgroundColor: stateColor[device.state] }}
                />
                <span className="status-text">{stateLabel[device.state]}</span>
              </div>
              <div className="device-name">
                {device.model || device.serial}
              </div>
              <div className="device-info">
                <span className="device-serial">{device.serial}</span>
                <span className={`device-transport ${device.connectionType}`}>
                  {device.connectionType === "wifi"
                    ? t.connectionWifi
                    : device.connectionType === "usb"
                      ? t.connectionUsb
                      : t.connectionUnknown}
                </span>
                {device.androidVersion && (
                  <span className="device-version">
                    Android {device.androidVersion}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
