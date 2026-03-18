import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectWifiDevice,
  disconnectWifiDevice,
  enableAdbOverTcpip,
  getDeviceStatus,
  scanSubnet,
} from "../../lib/api";
import { useDeviceStore } from "../../stores/deviceStore";
import { createLog, useLogStore } from "../../stores/logStore";
import { useT } from "../../lib/i18n";

export function ConnectionPanel() {
  const t = useT();
  const serial = useDeviceStore((s) => s.selectedSerial);
  const selectDevice = useDeviceStore((s) => s.selectDevice);
  const addLog = useLogStore((s) => s.addLog);
  const queryClient = useQueryClient();
  const [wifiTarget, setWifiTarget] = useState("");
  const [wifiBusy, setWifiBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["device-status", serial],
    queryFn: () => getDeviceStatus(serial!),
    enabled: !!serial,
    refetchInterval: 5000,
  });

  const canEnableWifiOverUsb =
    !!serial && status?.connectionType === "usb" && !!status.ipAddress;
  const wifiEnableReason = !serial
    ? t.wifiEnableReasonNoDevice
    : status?.connectionType !== "usb"
      ? t.wifiEnableReasonNotUsb
      : !status?.ipAddress
        ? t.wifiEnableReasonNoWifi
        : t.wifiEnableReasonOk;

  useEffect(() => {
    if (!serial) {
      setWifiTarget("");
      return;
    }

    setWifiTarget(
      status?.ipAddress ?? (serial.includes(":") ? (serial.split(":")[0] ?? "") : "")
    );
  }, [serial, status?.ipAddress]);

  const refreshDevices = async () => {
    await queryClient.invalidateQueries({ queryKey: ["devices"] });
    await queryClient.invalidateQueries({ queryKey: ["device-status"] });
  };

  const handleWifiEnable = async () => {
    if (!serial) return;
    setWifiBusy(true);
    try {
      const tcpip = await enableAdbOverTcpip(serial);
      const target =
        tcpip.connectedSerial ??
        (tcpip.ipAddress ? `${tcpip.ipAddress}:5555` : "");
      if (!target) throw new Error(t.wifiNoIp);
      const result = await connectWifiDevice(target);
      if (result.connectedSerial) selectDevice(result.connectedSerial);
      addLog(
        createLog(
          "wifi-connect",
          serial,
          result.success,
          result.rawOutput || t.connectedTo(target)
        )
      );
      await refreshDevices();
    } catch (error) {
      addLog(createLog("wifi-connect", serial, false, String(error)));
    } finally {
      setWifiBusy(false);
    }
  };

  const handleWifiConnect = async () => {
    const target = wifiTarget.trim();
    if (!target) return;
    setWifiBusy(true);
    try {
      const result = await connectWifiDevice(target);
      if (result.connectedSerial) selectDevice(result.connectedSerial);
      addLog(
        createLog(
          "wifi-connect",
          serial ?? target,
          result.success,
          result.rawOutput || t.connectedTo(target)
        )
      );
      await refreshDevices();
    } catch (error) {
      addLog(createLog("wifi-connect", serial ?? target, false, String(error)));
    } finally {
      setWifiBusy(false);
    }
  };

  const handleWifiDisconnect = async () => {
    if (!serial || status?.connectionType !== "wifi") return;
    setWifiBusy(true);
    try {
      const result = await disconnectWifiDevice(serial);
      addLog(
        createLog(
          "wifi-disconnect",
          serial,
          true,
          result || t.disconnectedFrom(serial)
        )
      );
      selectDevice(null);
      await refreshDevices();
    } catch (error) {
      addLog(createLog("wifi-disconnect", serial, false, String(error)));
    } finally {
      setWifiBusy(false);
    }
  };

  const handleSubnetScan = async () => {
    setScanBusy(true);
    try {
      const result = await scanSubnet();
      const detail =
        result.connected.length > 0
          ? t.subnetScanFound(result.connected.length, result.connected.join(", "))
          : t.subnetScanNotFound(result.reachableCount);
      addLog(
        createLog(
          "subnet-scan",
          result.localIp,
          true,
          detail
        )
      );
      await refreshDevices();
    } catch (error) {
      addLog(createLog("subnet-scan", "scan", false, String(error)));
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <div className="connection-panel">
      <h3>{t.connectionPanelTitle}</h3>
      <div className="connection-panel-input-row">
        <input
          className="connection-panel-input"
          value={wifiTarget}
          onChange={(e) => setWifiTarget(e.target.value)}
          placeholder="192.168.x.x[:5555]"
          disabled={wifiBusy}
        />
        <button
          onClick={handleWifiConnect}
          disabled={wifiBusy || !wifiTarget.trim()}
        >
          {t.connect}
        </button>
      </div>
      <div className="connection-panel-row">
        <button
          onClick={handleWifiEnable}
          disabled={wifiBusy || !canEnableWifiOverUsb}
          title={wifiEnableReason}
        >
          {t.usbToWifi}
        </button>
        <button
          className="btn-secondary"
          onClick={handleWifiDisconnect}
          disabled={!serial || wifiBusy || status?.connectionType !== "wifi"}
        >
          {t.disconnect}
        </button>
        <button
          className="btn-secondary"
          onClick={handleSubnetScan}
          disabled={scanBusy}
          title={t.subnetScanTitle}
        >
          {scanBusy ? t.scanning : t.subnetScan}
        </button>
      </div>
    </div>
  );
}
