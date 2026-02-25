import { Activity, Shield, Timer } from 'lucide-react';

import { useLanguage } from '../../hooks/useLanguage';
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
  const { copy, locale } = useLanguage();
  const metaCopy = copy.dashboard.meta;

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className={`${CARD} p-3.5`}>
        <div className="mb-1.5 flex items-center gap-2">
          <Timer className="h-3.5 w-3.5 text-cyan-500" />
          <p className="text-sm font-bold text-text-primary">{metaCopy.averageLatency}</p>
        </div>
        <p className="text-xl font-black text-text-primary">
          {avgLatency !== null ? `${avgLatency} ms` : metaCopy.noData}
        </p>
        <p className="text-xs text-text-secondary">{metaCopy.averageLatencyDescription}</p>
      </div>

      <div className={`${CARD} p-3.5`}>
        <div className="mb-1.5 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <p className="text-sm font-bold text-text-primary">{metaCopy.riskDevices}</p>
        </div>
        <p className="text-xl font-black text-text-primary">{highRiskDevices}</p>
        <p className="text-xs text-text-secondary">{metaCopy.riskDevicesDescription}</p>
      </div>

      <div className={`${CARD} p-3.5`}>
        <div className="mb-1.5 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-amber-500" />
          <p className="text-sm font-bold text-text-primary">{metaCopy.lastScan}</p>
        </div>
        <p className="text-xl font-black text-text-primary">
          {lastScanTime ? new Date(lastScanTime).toLocaleTimeString(locale) : metaCopy.never}
        </p>
        <p className="text-xs text-text-secondary">{metaCopy.lastScanDescription}</p>
      </div>
    </section>
  );
}
