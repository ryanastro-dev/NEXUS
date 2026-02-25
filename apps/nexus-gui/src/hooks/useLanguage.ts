import { create } from 'zustand';

import {
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_APP_LANGUAGE,
  resolveLanguageCopy,
  type AppLanguage,
} from '../lib/i18n/translations';

function isValidLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'my';
}

function readInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_LANGUAGE;
  }

  try {
    const stored = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
    if (isValidLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore localStorage read errors and fall back to defaults.
  }

  if (typeof navigator !== 'undefined') {
    const localeCandidates = [navigator.language, ...(navigator.languages ?? [])];
    const hasMyanmarLocale = localeCandidates.some((candidate) =>
      candidate.toLowerCase().startsWith('my'),
    );
    if (hasMyanmarLocale) {
      return 'my';
    }
  }

  return DEFAULT_APP_LANGUAGE;
}

function persistLanguage(language: AppLanguage): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore persistence failures and keep in-memory state responsive.
  }
}

interface LanguageStoreState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageStoreState>((set, get) => ({
  language: readInitialLanguage(),
  setLanguage: (language) => {
    const current = get().language;
    if (language === current) {
      return;
    }
    persistLanguage(language);
    set({ language });
  },
  toggleLanguage: () => {
    const next = get().language === 'en' ? 'my' : 'en';
    persistLanguage(next);
    set({ language: next });
  },
}));

export function useLanguage() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);
  const locale = language === 'my' ? 'my-MM' : 'en-US';

  return {
    language,
    locale,
    setLanguage,
    toggleLanguage,
    copy: resolveLanguageCopy(language),
    isMyanmar: language === 'my',
  };
}
