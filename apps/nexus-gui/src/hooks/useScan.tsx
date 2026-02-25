/**
 * React hook for managing network scan state and Tauri integration
 */

import {
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import { tauriClient } from "../lib/api/tauri-client";
import type {
  HostInfo,
  PortWarning,
  ScanResult,
  VulnerabilityInfo,
} from "../lib/api/types";
import { isTauri } from "../lib/runtime/is-tauri";
import { eventClient } from "../lib/api/event-client";
import { useNetworkRuntimeStore } from "../store/network-runtime-store";

export type { HostInfo, PortWarning, ScanResult, VulnerabilityInfo };

export type ScanStatus = 'ready' | 'scanning' | 'complete';

export interface ScanState {
  isScanning: boolean;
  scanStatus: ScanStatus;
  scanResult: ScanResult | null;
  error: string | null;
  lastScanTime: Date | null;
  scanProgress: number;
  scanPhase: string | null;
}

type UnlistenFn = () => void;

/**
 * Hook for managing network scan state
 */
export function useScan() {
  const [state, setState] = useState<ScanState>({
    isScanning: false,
    scanStatus: 'ready',
    scanResult: null,
    error: null,
    lastScanTime: null,
    scanProgress: 0,
    scanPhase: null,
  });
  const activeScanIdRef = useRef(0);
  const tauriAvailable = isTauri();

  useEffect(() => {
    if (!tauriAvailable) {
      return;
    }

    let unlisten: UnlistenFn | null = null;
    let disposed = false;

    const setupListener = async () => {
      try {
        const unsubscribe = await eventClient.listenNetworkEvents((payload) => {

            setState((prev) => {
              if (!prev.isScanning) {
                return prev;
              }

              if (payload.type === "ScanStarted") {
                return {
                  ...prev,
                  scanProgress: 0,
                  scanPhase: "interface",
                };
              }

              if (payload.type === "ScanCompleted") {
                return {
                  ...prev,
                  scanProgress: 100,
                  scanPhase: "complete",
                };
              }

              if (payload.type !== "ScanProgress") {
                return prev;
              }

              const progress = Math.max(
                0,
                Math.min(100, Math.round(payload.data.percent)),
              );
              const phase = payload.data.phase;

              return {
                ...prev,
                scanProgress: progress,
                scanPhase: phase || prev.scanPhase,
              };
            });
          });

        if (disposed) {
          unsubscribe();
          return;
        }
        unlisten = unsubscribe;
      } catch {
        // Ignore listener setup errors and keep scan flow functional.
      }
    };

    void setupListener();

    return () => {
      disposed = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [tauriAvailable]);

  // Perform a network scan
  const scan = useCallback(async () => {
    if (state.isScanning) {
      return;
    }

    activeScanIdRef.current += 1;
    const currentScanId = activeScanIdRef.current;

    // Check if demo mode is enabled
    const isDemoMode = localStorage.getItem("demo-mode-enabled") === "true";
    let preferredInterface: string | undefined;
    try {
      const rawSettings = localStorage.getItem("netmapper-settings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        const selected = parsed?.preferredInterface;
        if (typeof selected === "string" && selected.trim().length > 0) {
          preferredInterface = selected.trim();
        }
      }
    } catch {
      preferredInterface = undefined;
    }

    setState((prev) => ({
      ...prev,
      isScanning: true,
      scanStatus: "scanning",
      error: null,
      scanProgress: 0,
      scanPhase: "interface",
    }));

    try {
      const result = isDemoMode
        ? await tauriClient.mockScanNetwork()
        : await tauriClient.scanNetwork(preferredInterface);

      if (currentScanId !== activeScanIdRef.current) {
        return;
      }

      setState({
        isScanning: false,
        scanStatus: "complete",
        scanResult: result,
        error: null,
        lastScanTime: new Date(),
        scanProgress: 100,
        scanPhase: "complete",
      });
      useNetworkRuntimeStore.getState().hydrateFromScan(result);

      setTimeout(() => {
        if (currentScanId !== activeScanIdRef.current) {
          return;
        }

        setState((prev) => ({
          ...prev,
          scanStatus: "ready",
          scanProgress: 0,
          scanPhase: null,
        }));
      }, 1000);
    } catch (err) {
      if (currentScanId !== activeScanIdRef.current) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        isScanning: false,
        scanStatus: "ready",
        error: tauriAvailable
          ? errorMessage
          : "Not running in Tauri environment. Please run with `npm run tauri dev`.",
        scanProgress: 0,
        scanPhase: null,
      }));
    }
  }, [state.isScanning, tauriAvailable]);

  const stopScan = useCallback(() => {
    if (!state.isScanning) {
      return;
    }

    // Cancel backend scan context and ignore stale UI results.
    activeScanIdRef.current += 1;
    void tauriClient.cancelActiveScan().catch(() => {
      // Keep UI cancellation resilient if backend command is unavailable.
    });
    setState((prev) => ({
      ...prev,
      isScanning: false,
      scanStatus: "ready",
      error: null,
      scanProgress: 0,
      scanPhase: null,
    }));
  }, [state.isScanning]);

  return {
    ...state,
    scan,
    stopScan,
    tauriAvailable,
  };
}

/**
 * Global scan context
 */
interface ScanContextType extends ScanState {
  scan: () => Promise<void>;
  stopScan: () => void;
  tauriAvailable: boolean;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const scanState = useScan();

  return (
    <ScanContext.Provider value={scanState}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error('useScanContext must be used within a ScanProvider');
  }
  return context;
}
