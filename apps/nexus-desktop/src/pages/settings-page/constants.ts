export interface LocalSettings {
  snmpEnabled: boolean;
  snmpCommunity: string;
  scanInterval: number;
  tcpPorts: string;
  preferredInterface: string;
  monitoringEnabled: boolean;
  monitoringInterval: number;
}

export const DEFAULT_SETTINGS: LocalSettings = {
  snmpEnabled: false,
  snmpCommunity: 'public',
  scanInterval: 60,
  tcpPorts: '22, 80, 443, 445, 8080, 3389',
  preferredInterface: '',
  monitoringEnabled: false,
  monitoringInterval: 60,
};

export const SETTINGS_KEY = 'netmapper-settings';
export const VULN_DB_SYNC_KEY = 'netmapper-vuln-last-sync';
export const PANEL =
  'rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65';
