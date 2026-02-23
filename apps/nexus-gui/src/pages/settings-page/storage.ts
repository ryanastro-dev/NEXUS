import { SETTINGS_UPDATED_EVENT } from '../../lib/events/settings-sync';
import { DEFAULT_SETTINGS, SETTINGS_KEY, type LocalSettings } from './constants';

export function loadSettings(): LocalSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings: LocalSettings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SETTINGS_UPDATED_EVENT, {
          detail: settings,
        }),
      );
    }
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

export function parseTcpPorts(input: string): number[] {
  const ports = input
    .split(',')
    .map((port) => Number.parseInt(port.trim(), 10))
    .filter((port) => Number.isFinite(port) && port > 0 && port <= 65535);

  return Array.from(new Set(ports)).sort((a, b) => a - b);
}
