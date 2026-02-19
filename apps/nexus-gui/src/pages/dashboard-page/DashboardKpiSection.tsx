import { Cpu, Shield, ShieldAlert, Wifi } from 'lucide-react';

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
  const criticalAlertSubtitle =
    criticalAlerts === 1
      ? '1 critical unread alert'
      : `${criticalAlerts} critical unread alerts`;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Active (24h)"
        value={String(activeDevices24h)}
        subtitle={`${payload.devices.length} known devices`}
        icon={<Wifi className="h-4 w-4" />}
        tone="cyan"
      />
      <StatCard
        title="Security Score"
        value={`${payload.health?.score ?? 0}%`}
        subtitle={`Grade ${payload.health?.grade ?? 'N/A'} • ${payload.health?.status ?? 'No Data'}`}
        icon={<Shield className="h-4 w-4" />}
        tone="emerald"
      />
      <StatCard
        title="Unidentified"
        value={String(unknownDevices)}
        subtitle="Missing vendor/type fingerprint"
        icon={<Cpu className="h-4 w-4" />}
        tone="amber"
      />
      <StatCard
        title="Critical Alerts"
        value={String(criticalAlerts)}
        subtitle={criticalAlertSubtitle}
        icon={<ShieldAlert className="h-4 w-4" />}
        tone="rose"
      />
    </section>
  );
}
