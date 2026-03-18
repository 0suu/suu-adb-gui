import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeviceList } from "./features/devices/DeviceList";
import { ConnectionPanel } from "./features/devices/ConnectionPanel";
import { DeviceHeader } from "./features/devices/DeviceHeader";
import { LogcatTab } from "./features/logcat/LogcatTab";
import { PackagesTab } from "./features/packages/PackagesTab";
import { MediaTab } from "./features/media/MediaTab";
import { LogsTab } from "./features/logs/LogsTab";
import { ShellDialog } from "./features/shell/ShellDialog";
import { UpdateChecker } from "./features/updater/UpdateChecker";
import { useDeviceStore } from "./stores/deviceStore";
import { useLangStore } from "./stores/langStore";
import { useT } from "./lib/i18n";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2000,
    },
  },
});

type Tab = "packages" | "media" | "logcat" | "logs";

const SIDEBAR_RATIO_STORAGE_KEY = "adb-gui.sidebar-ratio";
const DEFAULT_SIDEBAR_RATIO = 0.28;
const MIN_SIDEBAR_RATIO = 0.18;
const MAX_SIDEBAR_RATIO = 0.52;

function clampSidebarRatio(ratio: number) {
  return Math.min(MAX_SIDEBAR_RATIO, Math.max(MIN_SIDEBAR_RATIO, ratio));
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("packages");
  const [shellOpen, setShellOpen] = useState(false);
  const [sidebarRatio, setSidebarRatio] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SIDEBAR_RATIO;
    }

    const saved = window.localStorage.getItem(SIDEBAR_RATIO_STORAGE_KEY);
    const parsed = saved ? Number(saved) : Number.NaN;
    return Number.isFinite(parsed)
      ? clampSidebarRatio(parsed)
      : DEFAULT_SIDEBAR_RATIO;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const terminalTargetCount = useDeviceStore((s) => s.terminalSerials.length);
  const { lang, toggleLang } = useLangStore();
  const t = useT();
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: "packages", label: t.tabPackages },
    { key: "media", label: t.tabMedia },
    { key: "logcat", label: t.tabLogcat },
    { key: "logs", label: t.tabLogs },
  ];

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_RATIO_STORAGE_KEY,
      String(sidebarRatio)
    );
  }, [sidebarRatio]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const layout = layoutRef.current;
      if (!layout) return;

      const bounds = layout.getBoundingClientRect();
      if (bounds.width <= 0) return;

      const rawRatio = (event.clientX - bounds.left) / bounds.width;
      setSidebarRatio(clampSidebarRatio(rawRatio));
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return undefined;
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [isResizingSidebar]);

  const handleSidebarResizeStart = () => {
    setIsResizingSidebar(true);
  };

  const handleSidebarResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -0.02 : 0.02;
    setSidebarRatio((current) => clampSidebarRatio(current + delta));
  };

  return (
    <div
      ref={layoutRef}
      className={`app-layout ${isResizingSidebar ? "is-resizing" : ""}`}
    >
      <aside className="sidebar" style={{ width: `${sidebarRatio * 100}%` }}>
        <div className="sidebar-device-area">
          <DeviceList />
        </div>
        <ConnectionPanel />
        <div className="sidebar-footer">
          <button className="lang-btn" onClick={toggleLang}>
            {lang === "ja" ? "EN" : "JA"}
          </button>
        </div>
      </aside>
      <div
        className="sidebar-resizer"
        role="separator"
        aria-label="Resize device list"
        aria-orientation="vertical"
        aria-valuemin={MIN_SIDEBAR_RATIO * 100}
        aria-valuemax={MAX_SIDEBAR_RATIO * 100}
        aria-valuenow={Math.round(sidebarRatio * 100)}
        tabIndex={0}
        onPointerDown={handleSidebarResizeStart}
        onKeyDown={handleSidebarResizeKeyDown}
      />
      <main className="main-content">
        <DeviceHeader />
        <nav className="tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <div className="tab-bar-spacer" />
          <button
            className="tab-bar-terminal-btn"
            onClick={() => setShellOpen(true)}
            disabled={terminalTargetCount === 0}
            title={t.terminal}
            aria-label={t.terminal}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="8 9 12 12 8 15" />
              <line x1="13" y1="15" x2="17" y2="15" />
            </svg>
          </button>
        </nav>
        <div className="tab-content">
          {activeTab === "packages" && <PackagesTab />}
          {activeTab === "media" && <MediaTab />}
          {activeTab === "logcat" && <LogcatTab />}
          {activeTab === "logs" && <LogsTab />}
        </div>
      </main>
      {shellOpen && <ShellDialog onClose={() => setShellOpen(false)} />}
      <UpdateChecker />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
