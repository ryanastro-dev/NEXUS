import { SCAN_PIPELINE_STAGES } from './constants';

export function phaseToStageIndex(phase: string | null): number {
  if (!phase) return 0;

  switch (phase) {
    case 'interface':
    case 'init':
      return 0;
    case 'discovery':
    case 'arp':
      return 1;
    case 'services':
    case 'probe':
    case 'icmp':
    case 'tcp':
    case 'security':
      return 2;
    case 'render':
    case 'topology':
    case 'dns':
    case 'persist':
    case 'finalize':
    case 'complete':
      return 3;
    default:
      return 0;
  }
}

export function resolveLatencyEdgeColor(latency: number, fallbackColor: string): string {
  if (latency < 50) return '#10B981';
  if (latency < 100) return '#F59E0B';
  return latency >= 100 ? '#EF4444' : fallbackColor;
}

export function loadingProgressPercent(scanProgress: number, activeStageIndex: number): number {
  if (scanProgress > 0) {
    return scanProgress;
  }
  return Math.round(((activeStageIndex + 1) / SCAN_PIPELINE_STAGES.length) * 100);
}
