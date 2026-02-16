import { useState } from "react";
import { Hash, Loader2, Play } from "lucide-react";

import { tauriClient } from "../../lib/api/tauri-client";
import type { PortScanResult } from "../../lib/api/types";

const CARD =
  "rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65";

export default function PortScanToolPanel() {
  const [target, setTarget] = useState("");
  const [startPort, setStartPort] = useState("1");
  const [endPort, setEndPort] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PortScanResult[]>([]);

  const handleScan = async () => {
    if (!target.trim()) return;
    const start = parseInt(startPort, 10);
    const end = parseInt(endPort, 10);
    if (Number.isNaN(start) || Number.isNaN(end)) return;

    setLoading(true);
    setResults([]);

    try {
      const ports = Array.from({ length: Math.min(end - start + 1, 100) }, (_, i) => start + i);
      const scanResults = await tauriClient.scanPorts(target.trim(), ports);
      setResults(scanResults);
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const openPorts = results.filter((r) => r.is_open);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className={`${CARD} p-5`}>
        <div className="mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4 text-accent-blue" />
          <h2 className="text-lg font-bold text-text-primary">Configuration</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
              Target IP
            </label>
            <input
              type="text"
              placeholder="192.168.1.1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
                Start Port
              </label>
              <input
                type="number"
                value={startPort}
                onChange={(e) => setStartPort(e.target.value)}
                className="w-full rounded border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
                End Port
              </label>
              <input
                type="number"
                value={endPort}
                onChange={(e) => setEndPort(e.target.value)}
                className="w-full rounded border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => void handleScan()}
            disabled={loading || !target.trim()}
            className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-blue/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Scan
              </>
            )}
          </button>
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">
          Results {openPorts.length > 0 && `(${openPorts.length} open)`}
        </h3>
        <div className="h-56 space-y-1 overflow-y-auto">
          {openPorts.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              No open ports found
            </div>
          )}
          {openPorts.map((r) => (
            <div
              key={r.port}
              className="flex items-center justify-between rounded border border-accent-green/30 bg-accent-green/10 p-2 text-xs"
            >
              <span className="font-mono font-bold text-accent-green">Port {r.port}</span>
              <span className="text-accent-green">{r.service || "Unknown"}</span>
            </div>
          ))}
          {loading && <div className="py-4 text-center text-xs text-text-muted">Scanning...</div>}
        </div>
      </div>
    </div>
  );
}
