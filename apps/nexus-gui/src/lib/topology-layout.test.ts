import { describe, expect, it } from "vitest";
import { generateTopologyLayout } from "./topology-layout";
import type { HostInfo } from "../hooks/useScan";

function host(overrides: Partial<HostInfo>): HostInfo {
  return {
    ip: "192.168.1.10",
    mac: "AA:BB:CC:DD:EE:10",
    device_type: "UNKNOWN",
    risk_score: 0,
    discovery_method: "ARP",
    ...overrides,
  };
}

describe("generateTopologyLayout", () => {
  it("returns empty graph for empty host list", () => {
    const topology = generateTopologyLayout([]);
    expect(topology.nodes).toEqual([]);
    expect(topology.edges).toEqual([]);
  });

  it("creates layered nodes and merges neighbor links", () => {
    const topology = generateTopologyLayout([
      host({
        ip: "192.168.1.1",
        mac: "AA:BB:CC:DD:EE:01",
        device_type: "ROUTER",
        risk_score: 12,
      }),
      host({
        ip: "192.168.1.2",
        mac: "AA:BB:CC:DD:EE:02",
        device_type: "PC",
        risk_score: 25,
      }),
      host({
        ip: "192.168.1.3",
        mac: "AA:BB:CC:DD:EE:03",
        device_type: "SERVER",
        risk_score: 30,
        neighbors: [
          {
            local_port: "Gi0/1",
            remote_device: "desktop-01",
            remote_port: "eth0",
            remote_ip: "192.168.1.2",
          },
        ],
      }),
    ]);

    expect(topology.nodes).toHaveLength(3);
    expect(topology.edges).toHaveLength(3);

    const nodeIds = topology.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining(["192.168.1.1", "192.168.1.2", "192.168.1.3"]),
    );

    const hasNeighborEdge = topology.edges.some(
      (edge) =>
        (edge.source === "192.168.1.3" && edge.target === "192.168.1.2") ||
        (edge.source === "192.168.1.2" && edge.target === "192.168.1.3"),
    );
    expect(hasNeighborEdge).toBe(true);
  });
});
