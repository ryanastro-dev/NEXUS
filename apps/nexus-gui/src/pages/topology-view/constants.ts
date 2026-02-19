import type { LucideIcon } from 'lucide-react';
import { Activity, Network, Radar, Shield } from 'lucide-react';

export const DEVICE_TYPE_COLORS: Record<string, string> = {
  ROUTER: '#3B82F6',
  SWITCH: '#10B981',
  ACCESS_POINT: '#0EA5E9',
  FIREWALL: '#EF4444',
  SERVER: '#F59E0B',
  NAS: '#F59E0B',
  LAPTOP: '#06B6D4',
  PC: '#06B6D4',
  MOBILE: '#14B8A6',
  PRINTER: '#22D3EE',
};

export interface ScanPipelineStage {
  id: string;
  title: string;
  detail: string;
  icon: LucideIcon;
}

export const SCAN_PIPELINE_STAGES: ScanPipelineStage[] = [
  {
    id: 'interface',
    title: 'Interface Handshake',
    detail: 'Validating adapter and subnet boundaries.',
    icon: Network,
  },
  {
    id: 'discovery',
    title: 'Host Discovery',
    detail: 'ARP + ICMP probing for reachable devices.',
    icon: Radar,
  },
  {
    id: 'services',
    title: 'Service Profiling',
    detail: 'TCP fingerprinting and response telemetry.',
    icon: Activity,
  },
  {
    id: 'render',
    title: 'Graph Synthesis',
    detail: 'Preparing topology graph and edge overlays.',
    icon: Shield,
  },
];
