import { Cpu, Shield, ShieldAlert, Wifi } from 'lucide-react';

import { useLanguage } from '../../hooks/useLanguage';
import { StatCard } from './widgets';
import type { DashboardPayloadView } from './types';

interface DashboardKpiSectionProps {
  payload: DashboardPayloadView;
  activeDevices24h: number;
  unknownDevices: number;
  criticalAlerts: number;
}

export function DashboardKpiSection({
  payload,
  activeDevices24h,
  unknownDevices,
  criticalAlerts,
}: DashboardKpiSectionProps) {
  const { copy } = useLanguage();
  const kpiCopy = copy.dashboard.kpi;
  const criticalAlertSubtitle =
    criticalAlerts === 1
      ? kpiCopy.criticalAlertSingular
      : kpiCopy.criticalAlertPlural.replace('{count}', String(criticalAlerts));

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={kpiCopy.active24h}
        value={activeDevices24h}
        subtitle={kpiCopy.knownDevices.replace('{count}', String(payload.devices.length))}
        icon={<Wifi className="h-4 w-4" />}
        tone="cyan"
      />
      <StatCard
        title={kpiCopy.securityScore}
        value={payload.health?.score ?? 0}
        suffix="%"
        subtitle={`${kpiCopy.gradePrefix} ${payload.health?.grade ?? 'N/A'} • ${payload.health?.status ?? kpiCopy.noData}`}
        icon={<Shield className="h-4 w-4" />}
        tone="emerald"
      />
      <StatCard
        title={kpiCopy.unidentified}
        value={unknownDevices}
        subtitle={kpiCopy.unidentifiedSubtitle}
        icon={<Cpu className="h-4 w-4" />}
        tone="amber"
      />
      <StatCard
        title={kpiCopy.criticalAlerts}
        value={criticalAlerts}
        subtitle={criticalAlertSubtitle}
        icon={<ShieldAlert className="h-4 w-4" />}
        tone="rose"
      />
    </section>
  );
}
