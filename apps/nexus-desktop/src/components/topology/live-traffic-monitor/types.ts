export interface TroubleshootTarget {
  mac?: string;
  ip?: string;
  hostname?: string;
  device_type?: string;
}

export interface StreamAction {
  kind: 'troubleshoot';
  label: string;
  target: TroubleshootTarget;
}

export interface StreamEvent {
  id: string;
  timestamp: string;
  message: string;
  rawMessage?: string;
  color: string;
  severity?: 'info' | 'warn' | 'error';
  source?: 'network' | 'engine';
  variant?: 'event' | 'separator';
  action?: StreamAction;
}

export interface LiveTrafficMonitorProps {
  visible: boolean;
  isDark: boolean;
  hasScanData?: boolean;
  onTroubleshoot?: (target: TroubleshootTarget) => void;
  isTroubleshooting?: boolean;
}

export type UnlistenFn = () => void;
