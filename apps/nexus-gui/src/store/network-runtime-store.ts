import { create } from "zustand";

import type {
  HostInfo,
  MonitorSnapshot,
  NetworkEventType,
  ScanResult,
} from "../lib/api/types";

type HostMap = Record<string, HostInfo>;

interface NetworkRuntimeState {
  hostsByMac: HostMap;
  lastScanResult: ScanResult | null;
  lastUpdatedAt: string | null;
  hydrateFromScan: (scanResult: ScanResult) => void;
  applyNetworkEvent: (event: NetworkEventType) => void;
  reconcileFromMonitorSnapshot: (snapshot: MonitorSnapshot) => void;
  clearRuntimeHosts: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeMacKey(mac: string | null | undefined): string {
  if (!mac || mac.trim().length === 0) {
    return "unknown";
  }
  return mac.trim().toLowerCase();
}

function buildFallbackHost(
  ip: string,
  mac: string,
  deviceType = "UNKNOWN",
  hostname?: string,
): HostInfo {
  return {
    ip,
    mac,
    hostname,
    device_type: deviceType,
    risk_score: 0,
    discovery_method: "ARP+MONITOR",
    response_time_ms: 1,
    open_ports: [],
    last_seen: nowIso(),
  };
}

function cloneHostMapFromScan(scanResult: ScanResult): HostMap {
  return scanResult.active_hosts.reduce<HostMap>((acc, host) => {
    const key = normalizeMacKey(host.mac);
    acc[key] = host;
    return acc;
  }, {});
}

function upsertOnlineHost(
  current: HostInfo | undefined,
  ip: string,
  mac: string,
  hostname: string | undefined,
  deviceType: string | undefined,
): HostInfo {
  const base = current ?? buildFallbackHost(ip, mac, deviceType ?? "UNKNOWN", hostname);
  return {
    ...base,
    ip,
    mac,
    hostname: hostname ?? base.hostname,
    device_type: deviceType ?? base.device_type,
    discovery_method: "ARP+MONITOR",
    response_time_ms:
      base.response_time_ms === null || base.response_time_ms === undefined
        ? 1
        : base.response_time_ms,
    last_seen: nowIso(),
  };
}

function applyNetworkEventToHosts(
  hostsByMac: HostMap,
  event: NetworkEventType,
): HostMap {
  switch (event.type) {
    case "NewDeviceDiscovered": {
      const key = normalizeMacKey(event.data.mac);
      const current = hostsByMac[key];
      return {
        ...hostsByMac,
        [key]: upsertOnlineHost(
          current,
          event.data.ip,
          event.data.mac,
          event.data.hostname,
          event.data.device_type,
        ),
      };
    }
    case "DeviceCameOnline": {
      const key = normalizeMacKey(event.data.mac);
      const current = hostsByMac[key];
      return {
        ...hostsByMac,
        [key]: upsertOnlineHost(
          current,
          event.data.ip,
          event.data.mac,
          event.data.hostname,
          current?.device_type,
        ),
      };
    }
    case "DeviceWentOffline": {
      const key = normalizeMacKey(event.data.mac);
      const current =
        hostsByMac[key] ??
        buildFallbackHost(
          event.data.last_ip,
          event.data.mac,
          "UNKNOWN",
          event.data.hostname,
        );

      return {
        ...hostsByMac,
        [key]: {
          ...current,
          ip: event.data.last_ip,
          mac: event.data.mac,
          hostname: event.data.hostname ?? current.hostname,
          discovery_method: "MONITOR_OFFLINE",
          response_time_ms: null,
          last_seen: nowIso(),
        },
      };
    }
    case "DeviceIpChanged": {
      const key = normalizeMacKey(event.data.mac);
      const current =
        hostsByMac[key] ??
        buildFallbackHost(event.data.new_ip, event.data.mac, "UNKNOWN");

      return {
        ...hostsByMac,
        [key]: {
          ...current,
          ip: event.data.new_ip,
          mac: event.data.mac,
          last_seen: nowIso(),
        },
      };
    }
    default:
      return hostsByMac;
  }
}

function markHostOffline(host: HostInfo): HostInfo {
  return {
    ...host,
    discovery_method: "MONITOR_OFFLINE",
    response_time_ms: null,
    last_seen: nowIso(),
  };
}

function isMonitorTrackedHost(host: HostInfo): boolean {
  return host.discovery_method.toUpperCase().includes("MONITOR");
}

function reconcileHostsFromMonitorSnapshot(
  hostsByMac: HostMap,
  snapshot: MonitorSnapshot,
): HostMap {
  const nextHosts: HostMap = { ...hostsByMac };
  const snapshotKeys = new Set<string>();

  for (const device of snapshot.devices) {
    const key = normalizeMacKey(device.mac);
    snapshotKeys.add(key);

    const current = nextHosts[key];
    if (device.is_online) {
      nextHosts[key] = upsertOnlineHost(
        current,
        device.ip,
        device.mac,
        device.hostname,
        device.device_type,
      );
      continue;
    }

    const base =
      current ??
      buildFallbackHost(
        device.ip,
        device.mac,
        device.device_type,
        device.hostname,
      );

    nextHosts[key] = {
      ...base,
      ip: device.ip,
      mac: device.mac,
      hostname: device.hostname ?? base.hostname,
      device_type: device.device_type,
      discovery_method: "MONITOR_OFFLINE",
      response_time_ms: null,
      last_seen: nowIso(),
    };
  }

  if (!snapshot.is_running) {
    return nextHosts;
  }

  for (const [key, host] of Object.entries(nextHosts)) {
    if (snapshotKeys.has(key)) {
      continue;
    }
    if (!isMonitorTrackedHost(host)) {
      continue;
    }
    if (host.response_time_ms === null || host.response_time_ms === undefined) {
      continue;
    }

    nextHosts[key] = markHostOffline(host);
  }

  return nextHosts;
}

export const useNetworkRuntimeStore = create<NetworkRuntimeState>((set) => ({
  hostsByMac: {},
  lastScanResult: null,
  lastUpdatedAt: null,
  hydrateFromScan: (scanResult) =>
    set({
      hostsByMac: cloneHostMapFromScan(scanResult),
      lastScanResult: scanResult,
      lastUpdatedAt: nowIso(),
    }),
  applyNetworkEvent: (event) =>
    set((state) => ({
      hostsByMac: applyNetworkEventToHosts(state.hostsByMac, event),
      lastUpdatedAt: nowIso(),
    })),
  reconcileFromMonitorSnapshot: (snapshot) =>
    set((state) => ({
      hostsByMac: reconcileHostsFromMonitorSnapshot(state.hostsByMac, snapshot),
      lastUpdatedAt:
        Number.isFinite(Date.parse(snapshot.captured_at))
          ? snapshot.captured_at
          : nowIso(),
    })),
  clearRuntimeHosts: () =>
    set({
      hostsByMac: {},
      lastUpdatedAt: nowIso(),
    }),
}));
