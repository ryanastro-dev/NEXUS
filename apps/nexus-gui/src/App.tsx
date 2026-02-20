import {
  useCallback,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import { ScanProvider, useScanContext, type HostInfo } from "./hooks/useScan";
import { useMonitoring } from "./hooks/useMonitoring";
import { useKeyboardShortcuts, SHORTCUTS } from "./hooks/useKeyboardShortcuts";
import Sidebar from "./components/layout/Sidebar";
import TopHeader from "./components/layout/TopHeader";
import DeviceDetailModal from "./components/devices/DeviceDetailModal";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import DemoBanner from "./components/common/DemoBanner";
import { tauriClient } from "./lib/api/tauri-client";
import {
  ALERTS_UNREAD_COUNT_EVENT,
  type AlertsUnreadCountDetail,
} from "./lib/events/alerts-sync";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const TopologyView = lazy(() => import("./pages/TopologyView"));
const DeviceList = lazy(() => import("./pages/DeviceList"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const Vulnerabilities = lazy(() => import("./pages/Vulnerabilities"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Tools = lazy(() => import("./pages/Tools"));
const ComponentDemo = lazy(() => import("./pages/ComponentDemo"));

type Page =
  | "dashboard"
  | "topology"
  | "devices"
  | "vulnerabilities"
  | "alerts"
  | "tools"
  | "reports"
  | "settings"
  | "profile"
  | "demo";

const PAGE_PATHS: Record<Page, string> = {
  dashboard: "/",
  topology: "/topology",
  devices: "/devices",
  vulnerabilities: "/vulnerabilities",
  alerts: "/alerts",
  tools: "/tools",
  reports: "/reports",
  settings: "/settings",
  profile: "/profile",
  demo: "/demo",
};

function pageFromPath(pathname: string): Page {
  const match = (Object.entries(PAGE_PATHS) as [Page, string][]).find(
    ([, path]) => path === pathname,
  );
  return match?.[0] ?? "dashboard";
}

function withSuspense(node: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-text-muted">
          Loading page...
        </div>
      }
    >
      {node}
    </Suspense>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>(() =>
    pageFromPath(window.location.pathname),
  );
  const [selectedDevice, setSelectedDevice] = useState<HostInfo | null>(null);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const { scan, stopScan, isScanning, scanStatus } = useScanContext();
  const monitoring = useMonitoring();
  const autoStartedMonitorRef = useRef(false);
  const { toggleTheme } = useTheme();

  const fetchUnreadAlertsCount = useCallback(async () => {
    try {
      const alerts = await tauriClient.getUnreadAlerts();
      setUnreadAlertsCount(alerts.filter((a) => !a.is_read).length);
    } catch {
      setUnreadAlertsCount(0);
    }
  }, []);

  useEffect(() => {
    const onAlertsUnreadCountChanged = (event: Event) => {
      const customEvent = event as CustomEvent<AlertsUnreadCountDetail>;
      const unreadCount = customEvent.detail?.unreadCount;
      if (typeof unreadCount === "number" && Number.isFinite(unreadCount)) {
        setUnreadAlertsCount(Math.max(0, Math.trunc(unreadCount)));
        return;
      }

      void fetchUnreadAlertsCount();
    };

    window.addEventListener(
      ALERTS_UNREAD_COUNT_EVENT,
      onAlertsUnreadCountChanged as EventListener,
    );
    return () => {
      window.removeEventListener(
        ALERTS_UNREAD_COUNT_EVENT,
        onAlertsUnreadCountChanged as EventListener,
      );
    };
  }, [fetchUnreadAlertsCount]);

  useEffect(() => {
    void fetchUnreadAlertsCount();
  }, [currentPage, fetchUnreadAlertsCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchUnreadAlertsCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadAlertsCount]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(pageFromPath(window.location.pathname));
    };

    const knownPaths = new Set(Object.values(PAGE_PATHS));
    if (!knownPaths.has(window.location.pathname)) {
      window.history.replaceState({ page: "dashboard" }, "", PAGE_PATHS.dashboard);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    try {
      const rawSettings = localStorage.getItem("netmapper-settings");
      if (!rawSettings) {
        return;
      }

      const parsed = JSON.parse(rawSettings);
      const snmpEnabled = parsed?.snmpEnabled === true;
      const snmpCommunity =
        typeof parsed?.snmpCommunity === "string" && parsed.snmpCommunity.trim().length > 0
          ? parsed.snmpCommunity.trim()
          : "public";
      const monitoringInterval = Number(parsed?.monitoringInterval);
      const tcpPorts = String(parsed?.tcpPorts ?? "")
        .split(",")
        .map((port) => Number.parseInt(port.trim(), 10))
        .filter((port) => Number.isFinite(port) && port > 0 && port <= 65535);
      const aiModeRaw = typeof parsed?.aiMode === "string" ? parsed.aiMode : "disabled";
      const aiMode =
        aiModeRaw === "local" ||
        aiModeRaw === "cloud" ||
        aiModeRaw === "hybrid_auto" ||
        aiModeRaw === "disabled"
          ? aiModeRaw
          : "disabled";
      const aiTimeout = Number(parsed?.aiTimeoutMs);
      const aiEnabled = parsed?.aiEnabled === true;
      const ollamaEndpoint =
        typeof parsed?.ollamaEndpoint === "string" && parsed.ollamaEndpoint.trim().length > 0
          ? parsed.ollamaEndpoint.trim()
          : "http://127.0.0.1:11434";
      const ollamaModel =
        typeof parsed?.ollamaModel === "string" && parsed.ollamaModel.trim().length > 0
          ? parsed.ollamaModel.trim()
          : "qwen3:8b";
      const geminiEndpoint =
        typeof parsed?.geminiEndpoint === "string" && parsed.geminiEndpoint.trim().length > 0
          ? parsed.geminiEndpoint.trim()
          : "https://generativelanguage.googleapis.com";
      const geminiModel =
        typeof parsed?.geminiModel === "string" && parsed.geminiModel.trim().length > 0
          ? parsed.geminiModel.trim()
          : "gemini-2.5-flash";
      const geminiApiKey =
        typeof parsed?.geminiApiKey === "string" && parsed.geminiApiKey.trim().length > 0
          ? parsed.geminiApiKey.trim()
          : null;
      const cloudAllowSensitive = parsed?.cloudAllowSensitive === true;

      void tauriClient
        .applyRuntimeSettings(
          snmpEnabled,
          snmpCommunity,
          tcpPorts,
          Number.isFinite(monitoringInterval) && monitoringInterval > 0
            ? monitoringInterval
            : undefined,
        )
        .catch(() => {
          // Keep startup resilient if runtime bridge is unavailable.
        });

      void tauriClient
        .applyAiRuntimeSettings({
          enabled: aiEnabled,
          mode: aiEnabled ? aiMode : "disabled",
          timeout_ms: Number.isFinite(aiTimeout) ? aiTimeout : 8000,
          ollama_endpoint: ollamaEndpoint,
          ollama_model: ollamaModel,
          gemini_endpoint: geminiEndpoint,
          gemini_model: geminiModel,
          gemini_api_key: geminiApiKey,
          cloud_allow_sensitive: cloudAllowSensitive,
        })
        .catch(() => {
          // Keep startup resilient if AI runtime bridge is unavailable.
        });
    } catch {
      // Keep startup resilient when local settings payload is malformed.
    }
  }, []);

  useEffect(() => {
    let shouldStopOnUnmount = false;

    if (autoStartedMonitorRef.current) {
      return;
    }

    try {
      const rawSettings = localStorage.getItem("netmapper-settings");
      if (!rawSettings) {
        return;
      }

      const parsed = JSON.parse(rawSettings);
      const monitoringEnabled = parsed?.monitoringEnabled === true;
      const interval = Number(parsed?.monitoringInterval);
      const monitoringInterval =
        Number.isFinite(interval) && interval > 0 ? interval : undefined;
      const preferredInterface =
        typeof parsed?.preferredInterface === "string" &&
        parsed.preferredInterface.trim().length > 0
          ? parsed.preferredInterface.trim()
          : undefined;

      if (monitoringEnabled) {
        autoStartedMonitorRef.current = true;
        shouldStopOnUnmount = true;
        void monitoring.startMonitoring(monitoringInterval, preferredInterface);
      }
    } catch {
      // Ignore malformed settings and keep default behavior.
    }

    return () => {
      if (shouldStopOnUnmount && autoStartedMonitorRef.current) {
        autoStartedMonitorRef.current = false;
        void monitoring.stopMonitoring();
      }
    };
  }, [monitoring.startMonitoring, monitoring.stopMonitoring]);

  useEffect(() => {
    const handleRefreshHotkeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isModifierRefresh = (event.ctrlKey || event.metaKey) && key === "r";
      const isFunctionRefresh = key === "f5";

      if (isModifierRefresh || isFunctionRefresh) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleZoomWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleRefreshHotkeys, true);
    window.addEventListener("wheel", handleZoomWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleRefreshHotkeys, true);
      window.removeEventListener("wheel", handleZoomWheel);
    };
  }, []);

  useKeyboardShortcuts([
    { ...SHORTCUTS.DASHBOARD, handler: () => handlePageChange("dashboard") },
    { ...SHORTCUTS.TOPOLOGY, handler: () => handlePageChange("topology") },
    { ...SHORTCUTS.DEVICES, handler: () => handlePageChange("devices") },
    { ...SHORTCUTS.SETTINGS, handler: () => handlePageChange("settings") },
    { ...SHORTCUTS.SCAN, handler: () => !isScanning && scan() },
    { ...SHORTCUTS.TOGGLE_THEME, handler: toggleTheme },
  ]);

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    const nextPath = PAGE_PATHS[page];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ page }, "", nextPath);
    }
  };

  const renderedPage = useMemo(() => {
    switch (currentPage) {
      case "dashboard":
        return withSuspense(<Dashboard monitor={monitoring} />);
      case "topology":
        return withSuspense(<TopologyView onDeviceClick={setSelectedDevice} />);
      case "devices":
        return withSuspense(<DeviceList onDeviceClick={setSelectedDevice} />);
      case "settings":
        return withSuspense(<Settings monitor={monitoring} />);
      case "demo":
        return withSuspense(<ComponentDemo />);
      case "vulnerabilities":
        return withSuspense(<Vulnerabilities />);
      case "alerts":
        return withSuspense(<Alerts />);
      case "tools":
        return withSuspense(<Tools />);
      case "reports":
        return withSuspense(<Reports />);
      default:
        return withSuspense(<Dashboard monitor={monitoring} />);
    }
  }, [currentPage, monitoring]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">

      <Sidebar currentPage={currentPage} onNavigate={handlePageChange} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {import.meta.env.DEV && <DemoBanner />}
        <TopHeader
          currentPage={currentPage}
          isScanning={isScanning}
          scanStatus={scanStatus}
          onStartScan={() => void scan()}
          onStopScan={stopScan}
          onNavigateToAlerts={() => handlePageChange("alerts")}
          unreadAlertsCount={unreadAlertsCount}
        />

        <main className="flex-1 overflow-auto">{renderedPage}</main>
      </div>

      <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ScanProvider>
          <AppContent />
          <ToastProvider />
        </ScanProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

