import type { AiMode } from '../../lib/api/types';

export interface LocalSettings {
  snmpEnabled: boolean;
  snmpCommunity: string;
  scanInterval: number;
  tcpPorts: string;
  preferredInterface: string;
  monitoringEnabled: boolean;
  monitoringInterval: number;
  aiEnabled: boolean;
  aiMode: AiMode;
  aiTimeoutMs: number;
  ollamaEndpoint: string;
  ollamaModel: string;
  geminiEndpoint: string;
  geminiModel: string;
  geminiApiKey: string;
  cloudAllowSensitive: boolean;
}

export const DEFAULT_SETTINGS: LocalSettings = {
  snmpEnabled: false,
  snmpCommunity: 'public',
  scanInterval: 60,
  tcpPorts: '22, 80, 443, 445, 8080, 3389',
  preferredInterface: '',
  monitoringEnabled: false,
  monitoringInterval: 60,
  aiEnabled: false,
  aiMode: 'disabled',
  aiTimeoutMs: 8000,
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen3:8b',
  geminiEndpoint: 'https://generativelanguage.googleapis.com',
  geminiModel: 'gemini-2.5-flash',
  geminiApiKey: '',
  cloudAllowSensitive: false,
};

export const SETTINGS_KEY = 'netmapper-settings';
export const VULN_DB_SYNC_KEY = 'netmapper-vuln-last-sync';
export const PANEL =
  'rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65';
