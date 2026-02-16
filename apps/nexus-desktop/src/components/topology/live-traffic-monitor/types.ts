export interface StreamEvent {
  id: string;
  timestamp: string;
  message: string;
  color: string;
}

export interface LiveTrafficMonitorProps {
  visible: boolean;
  isDark: boolean;
  hasScanData?: boolean;
}

export type UnlistenFn = () => void;
