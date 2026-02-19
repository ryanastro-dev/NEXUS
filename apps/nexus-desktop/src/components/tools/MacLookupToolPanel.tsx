import { useState } from "react";
import { AlertCircle, Loader2, Network, Search } from "lucide-react";

import { tauriClient } from "../../lib/api/tauri-client";
import type { VendorLookupResult } from "../../lib/api/types";

const CARD =
  "rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65";

export default function MacLookupToolPanel() {
  const [mac, setMac] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VendorLookupResult | null>(null);

  const handleLookup = async () => {
    if (!mac.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const lookupResult = await tauriClient.lookupMacVendor(mac.trim());
      setResult(lookupResult);
    } catch (error) {
      console.error("Lookup failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-xl border border-theme bg-bg-tertiary px-3 font-mono text-sm text-text-primary focus:border-accent-blue focus:outline-none";

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className={`${CARD} h-fit p-4`}>
        <div className="mb-3 flex items-center gap-2">
          <Network className="h-4 w-4 text-accent-blue" />
          <h2 className="text-base font-bold text-text-primary">Configuration</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">
              MAC Address
            </label>
            <input
              type="text"
              placeholder="00:1C:B3:00:00:00"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleLookup()}
              className={inputClass}
            />
          </div>

          <button
            onClick={() => void handleLookup()}
            disabled={loading || !mac.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-bold text-white shadow-lg shadow-accent-blue/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Lookup
              </>
            )}
          </button>

          <div className="text-xs text-text-muted">
            <p className="mb-1 font-semibold">Examples:</p>
            <button
              onClick={() => setMac("34:4a:c3:22:6f:90")}
              className="block w-full rounded-lg bg-bg-tertiary p-2 text-left font-mono hover:bg-bg-hover"
            >
              34:4a:c3:22:6f:90
            </button>
          </div>
        </div>
      </div>

      <div className={`${CARD} h-fit p-4`}>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Vendor Information</h3>
        {!result ? (
          <div className="flex h-[190px] items-center justify-center text-xs text-text-muted">
            Enter MAC to lookup
          </div>
        ) : result.is_randomized ? (
          <div className="rounded border border-accent-amber/30 bg-accent-amber/10 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
              <div>
                <p className="mb-1 text-sm font-bold text-accent-amber">Randomized MAC</p>
                <p className="text-xs text-text-secondary">
                  This is a locally administered MAC address used for privacy.
                </p>
              </div>
            </div>
          </div>
        ) : result.vendor ? (
          <div className="rounded border border-accent-green/30 bg-accent-green/10 p-4">
            <p className="mb-1 text-xs uppercase text-text-muted">Vendor</p>
            <p className="text-lg font-bold text-accent-green">{result.vendor}</p>
          </div>
        ) : (
          <div className="rounded border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">
            Vendor not found
          </div>
        )}
      </div>
    </div>
  );
}
