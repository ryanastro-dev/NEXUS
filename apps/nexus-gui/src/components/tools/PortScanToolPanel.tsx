import { useState } from "react";
import { Hash, Loader2, Play } from "lucide-react";

import { tauriClient } from "../../lib/api/tauri-client";
import type { PortScanResult } from "../../lib/api/types";
import { useLanguage } from "../../hooks/useLanguage";
import { PANEL_CARD } from "../../lib/ui-classes";
import { Tooltip } from "../common/Tooltip";

const CARD = PANEL_CARD;

export default function PortScanToolPanel() {
  const { copy } = useLanguage();
  const portScanCopy = copy.tools.portScan;
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
  const inputClass =
    "h-11 w-full rounded-xl border border-theme bg-bg-tertiary px-3 text-sm text-text-primary focus:border-accent-blue focus:outline-none";

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className={`${CARD} h-fit p-4`}>
        <div className="mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4 text-accent-blue" />
          <h2 className="text-base font-bold text-text-primary">{portScanCopy.configuration}</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
              {portScanCopy.targetIp}
            </label>
            <input
              type="text"
              placeholder={portScanCopy.targetPlaceholder}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
                {portScanCopy.startPort}
              </label>
              <input
                type="number"
                value={startPort}
                onChange={(e) => setStartPort(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
                {portScanCopy.endPort}
              </label>
              <input
                type="number"
                value={endPort}
                onChange={(e) => setEndPort(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <Tooltip content={portScanCopy.invalidTargetHint} active={!target.trim()}>
            <button
              onClick={() => void handleScan()}
              disabled={loading || !target.trim()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-bold text-white shadow-lg shadow-accent-blue/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {portScanCopy.running}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {portScanCopy.start}
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={`${CARD} h-fit p-4`}>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">
          {portScanCopy.results}{' '}
          {openPorts.length > 0 &&
            portScanCopy.openCount.replace('{count}', String(openPorts.length))}
        </h3>
        <div className="h-[208px] space-y-1 overflow-y-auto">
          {openPorts.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              {portScanCopy.noOpenPorts}
            </div>
          )}
          {openPorts.map((r) => (
            <div
              key={r.port}
              className="flex items-center justify-between rounded border border-accent-green/30 bg-accent-green/10 p-2 text-xs"
            >
              <span className="font-mono font-bold text-accent-green">Port {r.port}</span>
              <span className="text-accent-green">{r.service || portScanCopy.unknownService}</span>
            </div>
          ))}
          {loading && (
            <div className="py-4 text-center text-xs text-text-muted">{portScanCopy.running}</div>
          )}
        </div>
      </div>
    </div>
  );
}
