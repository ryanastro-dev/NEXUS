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
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className={`${CARD} p-4`}>
        <div className="mb-2 flex items-center gap-2">
          <Timer className="h-4 w-4 text-cyan-500" />
          <p className="text-sm font-bold text-text-primary">Average Latency</p>
        </div>
        <p className="text-2xl font-black text-text-primary">
          {avgLatency !== null ? `${avgLatency} ms` : 'No data'}
        </p>
        <p className="text-xs text-text-secondary">Computed from latest active scan results.</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-bold text-text-primary">Risk Devices</p>
        </div>
        <p className="text-2xl font-black text-text-primary">{highRiskDevices}</p>
        <p className="text-xs text-text-secondary">Devices with risk score above policy threshold.</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-bold text-text-primary">Last Scan</p>
        </div>
        <p className="text-2xl font-black text-text-primary">
          {lastScanTime ? new Date(lastScanTime).toLocaleTimeString() : 'Never'}
        </p>
        <p className="text-xs text-text-secondary">Latest persisted network scan timestamp.</p>
      </div>
    </section>
  );
}
