import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { confirm, open } from "@tauri-apps/plugin-dialog";
import {
  getPackages,
  uninstallPackage,
  runPackage,
  installApk,
} from "../../lib/api";
import { useDeviceStore } from "../../stores/deviceStore";
import { useLogStore, createLog } from "../../stores/logStore";
import { useT } from "../../lib/i18n";

export function PackagesTab() {
  const t = useT();
  const serial = useDeviceStore((s) => s.selectedSerial);
  const addLog = useLogStore((s) => s.addLog);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [installing, setInstalling] = useState(false);

  const {
    data: packages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["packages", serial],
    queryFn: () => getPackages(serial!),
    enabled: !!serial,
  });

  if (!serial) {
    return <div className="tab-placeholder">{t.selectDevice}</div>;
  }

  const filtered = (packages ?? []).filter((p) =>
    p.packageName.toLowerCase().includes(search.toLowerCase())
  );

  const handleInstall = async () => {
    const file = await open({
      filters: [{ name: "APK", extensions: ["apk"] }],
    });
    if (!file) return;

    setInstalling(true);
    try {
      const result = await installApk({
        serial,
        apkPath: file,
        replaceExisting,
      });
      addLog(
        createLog(
          "install",
          serial,
          result.success,
          result.success
            ? t.installSuccess(file)
            : t.installFail(result.failureReason ?? result.rawOutput)
        )
      );
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["packages", serial] });
      }
    } catch (e) {
      addLog(createLog("install", serial, false, String(e)));
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (packageName: string) => {
    const ok = await confirm(t.uninstallConfirm(packageName), { kind: "warning" });
    if (!ok) return;
    try {
      const result = await uninstallPackage(serial, packageName);
      addLog(
        createLog(
          "uninstall",
          serial,
          result.success,
          result.success
            ? t.uninstallSuccess(packageName)
            : t.uninstallFail(result.rawOutput)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["packages", serial] });
    } catch (e) {
      addLog(createLog("uninstall", serial, false, String(e)));
    }
  };

  const handleRun = async (packageName: string) => {
    try {
      const result = await runPackage(serial, packageName);
      addLog(
        createLog(
          "run",
          serial,
          result.success,
          result.success
            ? t.runSuccess(packageName)
            : t.runFail(result.rawOutput)
        )
      );
    } catch (e) {
      addLog(createLog("run", serial, false, String(e)));
    }
  };

  return (
    <div className="packages-tab">
      <div className="packages-toolbar">
        <button onClick={handleInstall} disabled={installing}>
          {installing ? t.installing : t.installApk}
        </button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
          />
          {t.replaceExisting}
        </label>
        <input
          type="text"
          placeholder={t.searchPackages}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {isLoading && <div className="loading">{t.loading}</div>}
      {error && <div className="error">{t.error}: {String(error)}</div>}

      <div className="package-list">
        {filtered.map((pkg) => (
          <div key={pkg.packageName} className="package-item">
            <span className="package-name">{pkg.packageName}</span>
            <div className="package-actions">
              <button
                className="btn-small btn-run"
                onClick={() => handleRun(pkg.packageName)}
              >
                {t.run}
              </button>
              <button
                className="btn-small btn-danger"
                onClick={() => handleUninstall(pkg.packageName)}
              >
                {t.uninstall}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
