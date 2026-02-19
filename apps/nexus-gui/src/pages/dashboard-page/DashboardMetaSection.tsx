import { Activity, Shield, Timer } from 'lucide-react';

import { CARD } from './constants';

interface DashboardMetaSectionProps {
  avgLatency: number | null;
  highRiskDevices: number;
  lastScanTime?: string | null;
}

export function DashboardMetaSection({
  avgLatency,
  highRiskDevices,
  lastScanTime,
}: DashboardMetaSectionProps) {
  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className={`${CARD} p-3.5`}>
        <div className="mb-1.5 flex items-center gap-2">
          <Timer className="h-3.5 w-3.5 text-cyan-500" />
          <p className="text-sm font-bold text-text-primary">Average Latency</p>
        </div>
        <p className="text-xl font-black text-text-primary">
          {avgLatency !== null ? `${avgLatency} ms` : 'No data'}
        </p>
        <p className="text-xs text-text-secondary">Computed from latest active scan results.</p>
      </div>

      <div className={`${CARD} p-3.5`}>
        <div className="mb-1.5 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <p className="text-sm font-bold text-text-primary">Risk Devices</p>
        </div>
        <p className="text-xl font-black text-text-primary">{highRiskDevices}</p>
        <p className="text-xs text-text-secondary">Devices with risk score above policy threshold.</p>
      </div>

      <div className={`${CARD} p-3.5`}>
        <div className="mb-1.5 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-amber-500" />
          <p className="text-sm font-bold text-text-primary">Last Scan</p>
        </div>
        <p className="text-xl font-black text-text-primary">
          {lastScanTime ? new Date(lastScanTime).toLocaleTimeString() : 'Never'}
        </p>
        <p className="text-xs text-text-secondary">Latest persisted network scan timestamp.</p>
      </div>
    </section>
  );
}
