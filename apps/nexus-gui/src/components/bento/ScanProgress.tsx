/**
 * ScanProgress - Sidebar component showing scanning progress
 */

import { Activity, Wifi, Server, Globe, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface ScanProgressProps {
  isScanning: boolean;
  currentPhase?: string | null;
  progress?: number;
  phasesCompleted?: {
    arp: boolean;
    icmp: boolean;
    tcp: boolean;
    dns: boolean;
  };
  devicesFound?: number;
  elapsedTime?: number;
}

const phases = [
  { id: 'arp', labelKey: 'arpDiscovery', icon: Wifi },
  { id: 'icmp', labelKey: 'icmpPing', icon: Activity },
  { id: 'tcp', labelKey: 'tcpProbe', icon: Server },
  { id: 'dns', labelKey: 'dnsLookup', icon: Globe },
] as const;

export default function ScanProgress({
  isScanning,
  currentPhase = null,
  progress = 0,
  phasesCompleted = { arp: false, icmp: false, tcp: false, dns: false },
  devicesFound = 0,
  elapsedTime = 0,
}: ScanProgressProps) {
  const { copy } = useLanguage();
  const scanProgressCopy = copy.common.scanProgress;

  if (!isScanning) {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="p-4 bg-[var(--color-bg-tertiary)]/50 rounded-xl border border-[var(--color-border)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {scanProgressCopy.scanning}
          </span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          {formatTime(elapsedTime)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">
            {currentPhase || scanProgressCopy.initializing}
          </span>
          <span className="text-[var(--color-text-secondary)]">{progress}%</span>
        </div>
        <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-teal transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase checklist */}
      <div className="grid grid-cols-2 gap-2">
        {phases.map((phase) => {
          const Icon = phase.icon;
          const isActive = currentPhase?.toLowerCase().includes(phase.id);
          const isComplete = phasesCompleted[phase.id as keyof typeof phasesCompleted];

          return (
            <div
              key={phase.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : isComplete
                  ? 'text-accent-green'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
              )}
              <span className="text-xs">{scanProgressCopy.phases[phase.labelKey]}</span>
            </div>
          );
        })}
      </div>

      {/* Devices found */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-[var(--color-border)]">
        <Server className="w-4 h-4 text-accent-green" />
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          {devicesFound}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{scanProgressCopy.devicesFound}</span>
      </div>
    </div>
  );
}
