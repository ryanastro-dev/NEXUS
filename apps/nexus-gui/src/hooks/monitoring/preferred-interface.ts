const SETTINGS_STORAGE_KEY = 'netmapper-settings';

export function resolvePreferredInterface(interfaceName?: string): string | undefined {
  if (interfaceName && interfaceName.trim().length > 0) {
    return interfaceName.trim();
  }

  try {
    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return undefined;
    }

    const parsed = JSON.parse(rawSettings);
    const selected = parsed?.preferredInterface;
    if (typeof selected !== 'string' || selected.trim().length === 0) {
      return undefined;
    }

    return selected.trim();
  } catch {
    return undefined;
  }
}
