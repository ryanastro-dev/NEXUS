import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import { ScanProvider, useScanContext } from "./hooks/useScan";
import { useMonitoring } from "./hooks/useMonitoring";
import { useKeyboardShortcuts, SHORTCUTS } from "./hooks/useKeyboardShortcuts";
import Sidebar from "./components/layout/Sidebar";
import TopHeader from "./components/layout/TopHeader";
import DeviceDetailModal from "./components/devices/DeviceDetailModal";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import DemoBanner from "./components/common/DemoBanner";
import DesktopModeNotice from "./components/common/DesktopModeNotice";
import { tauriClient } from "./lib/api/tauri-client";
import { isTauri } from "./lib/runtime/is-tauri";
import {
  ALERTS_UNREAD_COUNT_EVENT,
  type AlertsUnreadCountDetail,
} from "./lib/events/alerts-sync";
import { SETTINGS_UPDATED_EVENT } from "./lib/events/settings-sync";
import { pageFromPath, PAGE_PATHS, type Page } from "./router";
import { useDeviceDetailStore } from "./store/device-detail-store";

/**
 * Root layout rendered by TanStack Router's root route.
 * Contains the shell (sidebar, header, device modal) and renders
 * the matched child route via `<Outlet />`.
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ScanProvider>
          <AppShell />
          <ToastProvider />
        </ScanProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Internal shell — all the side-effects, monitoring, keyboard shortcuts, etc.
// ---------------------------------------------------------------------------
function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = pageFromPath(location.pathname);
  const runningInBrowser = !isTauri();

  const selectedDevice = useDeviceDetailStore((state) => state.selectedDevice);
  const closeDeviceDetails = useDeviceDetailStore((state) => state.closeDeviceDetails);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const { scan, stopScan, isScanning, scanStatus } = useScanContext();
  const monitoring = useMonitoring();
  const autoStartedMonitorRef = useRef(false);
  const { toggleTheme } = useTheme();

  // ------- Alerts unread count -------
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

  // ------- Runtime settings sync -------
  const applyRuntimeFromRawSettings = useCallback(
    (rawSettings: string | null) => {
      try {
        if (!rawSettings) {
          return null;
        }

        const parsed = JSON.parse(rawSettings);
        const snmpEnabled = parsed?.snmpEnabled === true;
        const snmpCommunity =
          typeof parsed?.snmpCommunity === "string" && parsed.snmpCommunity.trim().length > 0
            ? parsed.snmpCommunity.trim()
            : "public";
        const monitoringInterval = Number(parsed?.monitoringInterval);
        const monitoringEnabled = parsed?.monitoringEnabled === true;
        const preferredInterface =
          typeof parsed?.preferredInterface === "string" && parsed.preferredInterface.trim().length > 0
            ? parsed.preferredInterface.trim()
            : undefined;
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
            : "gemini-3.1-pro";
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
            // Keep runtime settings apply resilient if bridge is unavailable.
          });

        void tauriClient
          .applyAiRuntimeSettings({
            enabled: aiEnabled,
            mode: aiEnabled ? aiMode : "disabled",
            timeout_ms: Number.isFinite(aiTimeout) ? aiTimeout : 20000,
            ollama_endpoint: ollamaEndpoint,
            ollama_model: ollamaModel,
            gemini_endpoint: geminiEndpoint,
            gemini_model: geminiModel,
            gemini_api_key: geminiApiKey,
            cloud_allow_sensitive: cloudAllowSensitive,
          })
          .catch(() => {
            // Keep AI settings apply resilient if bridge is unavailable.
          });

        return {
          monitoringEnabled,
          monitoringInterval:
            Number.isFinite(monitoringInterval) && monitoringInterval > 0
              ? monitoringInterval
              : undefined,
          preferredInterface,
        };
      } catch {
        // Keep startup resilient when local settings payload is malformed.
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    void applyRuntimeFromRawSettings(localStorage.getItem("netmapper-settings"));
  }, [applyRuntimeFromRawSettings]);

  // ------- Auto-start monitoring -------
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
      const monitoringIntervalVal =
        Number.isFinite(interval) && interval > 0 ? interval : undefined;
      const preferredInterface =
        typeof parsed?.preferredInterface === "string" &&
          parsed.preferredInterface.trim().length > 0
          ? parsed.preferredInterface.trim()
          : undefined;

      if (monitoringEnabled) {
        autoStartedMonitorRef.current = true;
        shouldStopOnUnmount = true;
        void monitoring.startMonitoring(monitoringIntervalVal, preferredInterface);
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

  // ------- Settings updated listener -------
  useEffect(() => {
    const applyFromStorage = () => {
      const snapshot = applyRuntimeFromRawSettings(localStorage.getItem("netmapper-settings"));
      if (!snapshot) {
        return;
      }

      if (snapshot.monitoringEnabled) {
        autoStartedMonitorRef.current = true;
        void monitoring.startMonitoring(snapshot.monitoringInterval, snapshot.preferredInterface);
      } else if (autoStartedMonitorRef.current) {
        autoStartedMonitorRef.current = false;
        void monitoring.stopMonitoring();
      }
    };

    const onSettingsUpdated = (_event: Event) => {
      applyFromStorage();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "netmapper-settings") {
        return;
      }
      applyFromStorage();
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [applyRuntimeFromRawSettings, monitoring.startMonitoring, monitoring.stopMonitoring]);

  // ------- Prevent browser refresh in Tauri -------
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

  // ------- Navigation helper -------
  const handlePageChange = useCallback(
    (page: Page) => {
      void navigate({ to: PAGE_PATHS[page] });
    },
    [navigate],
  );

  // ------- Keyboard shortcuts -------
  useKeyboardShortcuts([
    { ...SHORTCUTS.DASHBOARD, handler: () => handlePageChange("dashboard") },
    { ...SHORTCUTS.TOPOLOGY, handler: () => handlePageChange("topology") },
    { ...SHORTCUTS.DEVICES, handler: () => handlePageChange("devices") },
    { ...SHORTCUTS.SETTINGS, handler: () => handlePageChange("settings") },
    { ...SHORTCUTS.SCAN, handler: () => !isScanning && scan() },
    { ...SHORTCUTS.TOGGLE_THEME, handler: toggleTheme },
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">

      <Sidebar currentPage={currentPage} onNavigate={handlePageChange} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {import.meta.env.DEV && <DemoBanner />}
        {runningInBrowser ? <DesktopModeNotice className="mx-4 mt-2" /> : null}
        <TopHeader
          currentPage={currentPage}
          isScanning={isScanning}
          scanStatus={scanStatus}
          onStartScan={() => void scan()}
          onStopScan={stopScan}
          onNavigateToAlerts={() => handlePageChange("alerts")}
          unreadAlertsCount={unreadAlertsCount}
        />

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {selectedDevice ? (
        <DeviceDetailModal device={selectedDevice} onClose={closeDeviceDetails} />
      ) : null}
    </div>
  );
}
