import { useState } from "react";
import { Activity, Loader2, Play, Terminal } from "lucide-react";

import Select from "../common/Select";
import { tauriClient } from "../../lib/api/tauri-client";
import type { PingResult } from "../../lib/api/types";

const CARD =
  "rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65";

export default function PingToolPanel() {
  const [target, setTarget] = useState("");
  const [count, setCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PingResult[]>([]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  const handlePing = async () => {
    if (!target.trim()) return;

    setLoading(true);
    setResults([]);
    setTerminalOutput([`$ ping ${target.trim()}`, `Sending ${count} packets...`, ""]);

    try {
      const pingResults = await tauriClient.pingHost(target.trim(), count);
      setResults(pingResults);

      const output = pingResults.map((result) =>
        result.success
          ? `Reply from ${target}: bytes=32 time=${result.latency_ms}ms TTL=${result.ttl}`
          : "Request timed out",
      );
      setTerminalOutput((prev) => [
        ...prev,
        ...output,
        "",
        "Ping statistics:",
        `Sent = ${count}, Received = ${pingResults.filter((item) => item.success).length}`,
      ]);
    } catch (error) {
      console.error("Ping failed:", error);
      setTerminalOutput((prev) => [...prev, `Error: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  const successfulPings = results.filter((r) => r.success).length;
  const avgLatency =
    results.filter((r) => r.latency_ms !== null).reduce((sum, r) => sum + (r.latency_ms || 0), 0) /
    (successfulPings || 1);
  const packetOptions = [
    { value: 4, label: "4 packets (Default)" },
    { value: 1, label: "1 packet" },
    { value: 10, label: "10 packets" },
  ];
  const inputClass =
    "h-11 w-full rounded-xl border border-theme bg-bg-tertiary px-3 text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none";

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
      <div className={`${CARD} p-4 lg:h-full`}>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-blue" />
          <h2 className="text-base font-bold text-text-primary">Configuration</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
              Target Host
            </label>
            <input
              type="text"
              placeholder="e.g. google.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handlePing()}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
              Packet Count
            </label>
            <Select
              options={packetOptions}
              value={count}
              onChange={(value) => setCount(Number(value))}
              searchable={false}
              fullWidth
            />
          </div>

          <button
            onClick={() => void handlePing()}
            disabled={loading || !target.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-bold text-white shadow-lg shadow-accent-blue/30 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Pinging...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Ping
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex h-full flex-col gap-3">
        <div className={`${CARD} flex min-h-[292px] flex-1 flex-col overflow-hidden lg:min-h-0`}>
          <div className="flex items-center justify-between border-b border-slate-700/70 bg-slate-900 px-3 py-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-green-400" />
              <h3 className="text-sm font-semibold text-white">Output</h3>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs text-green-400">
            {terminalOutput.length <= 3 && !loading ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-500">
                <Terminal className="mb-2 h-10 w-10 opacity-20" />
                <p className="text-xs">Ready...</p>
              </div>
            ) : (
              <>
                {terminalOutput.map((line, index) => (
                  <div key={index}>{line || <br />}</div>
                ))}
                {loading && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="h-1 w-1 animate-pulse rounded-full bg-green-400" />
                    Processing...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className={`${CARD} rounded-xl p-2.5`}>
              <p className="text-xs font-semibold uppercase text-text-muted">Sent</p>
              <p className="text-lg font-bold text-text-primary">{results.length}</p>
            </div>
            <div className={`${CARD} rounded-xl p-2.5`}>
              <p className="text-xs font-semibold uppercase text-text-muted">Got</p>
              <p className="text-lg font-bold text-accent-green">{successfulPings}</p>
            </div>
            <div className={`${CARD} rounded-xl p-2.5`}>
              <p className="text-xs font-semibold uppercase text-text-muted">Lost</p>
              <p className="text-lg font-bold text-accent-red">{results.length - successfulPings}</p>
            </div>
            <div className={`${CARD} rounded-xl p-2.5`}>
              <p className="text-xs font-semibold uppercase text-text-muted">Avg</p>
              <p className="text-lg font-bold text-accent-blue">{avgLatency.toFixed(1)}ms</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
