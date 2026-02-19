import { describe, expect, it } from "vitest";
import { formatEventMessage, getEventStyle } from "./useMonitoring";
import { createInitialMonitoringState, reduceMonitoringState } from "./monitoring";
import type { NetworkEventType } from "../lib/api/types";

describe("useMonitoring helpers", () => {
  it("formats scan completion messages with host and duration data", () => {
    const event: NetworkEventType = {
      type: "ScanCompleted",
      data: {
        scan_number: 3,
        hosts_found: 17,
        duration_ms: 4200,
      },
    };

    expect(formatEventMessage(event)).toBe("Scan #3 complete: 17 hosts (4.2s)");
  });

  it("formats IP change events", () => {
    const event: NetworkEventType = {
      type: "DeviceIpChanged",
      data: {
        mac: "AA:BB:CC:DD:EE:FF",
        old_ip: "192.168.1.20",
        new_ip: "192.168.1.55",
      },
    };

    expect(formatEventMessage(event)).toBe("IP changed: 192.168.1.20 → 192.168.1.55");
  });

  it("returns fallback style for unknown events", () => {
    const style = getEventStyle("UnknownEvent");
    expect(style.icon).toBe("📌");
    expect(style.color).toBe("text-gray-500");
  });

  it("updates status timestamps and counts on ScanCompleted", () => {
    const initial = createInitialMonitoringState();
    const event: NetworkEventType = {
      type: "ScanCompleted",
      data: {
        scan_number: 1,
        hosts_found: 5,
        duration_ms: 1500,
      },
    };

    const next = reduceMonitoringState(initial, event, 50);
    expect(next.status.scan_count).toBe(1);
    expect(next.status.devices_total).toBe(5);
    expect(next.status.devices_online).toBe(5);
    expect(next.status.last_scan_time).toBeDefined();
    expect(Number.isFinite(Date.parse(next.status.last_scan_time ?? ""))).toBe(true);
  });
});
