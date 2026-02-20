import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentWindow, type Theme as TauriTheme } from '@tauri-apps/api/window';
import { isTauri } from '../lib/runtime/is-tauri';

type Theme = 'dark' | 'light';
type ThemeMode = Theme | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function fromTauriTheme(theme: TauriTheme | null): Theme | null {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }
  return null;
}

function detectSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function resolveInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const savedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
  if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
    return savedMode;
  }

  const legacyTheme = localStorage.getItem('theme') as Theme | null;
  if (legacyTheme === 'light' || legacyTheme === 'dark') {
    return legacyTheme;
  }

  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => resolveInitialThemeMode());
  const [systemTheme, setSystemTheme] = useState<Theme>(() => detectSystemTheme());
  const theme: Theme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const updateSystemTheme = (matches: boolean) => {
      setSystemTheme(matches ? 'light' : 'dark');
    };

    updateSystemTheme(mediaQuery.matches);
    const listener = (event: MediaQueryListEvent) => updateSystemTheme(event.matches);
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    let disposed = false;

    void appWindow
      .theme()
      .then((tauriTheme) => {
        if (disposed) {
          return;
        }
        const resolved = fromTauriTheme(tauriTheme);
        if (resolved) {
          setSystemTheme(resolved);
        }
      })
      .catch(() => {
        // Keep browser media-query fallback when native theme read fails.
      });

    void appWindow
      .onThemeChanged(({ payload }) => {
        const resolved = fromTauriTheme(payload);
        if (resolved) {
          setSystemTheme(resolved);
        }
      })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlisten = cleanup;
      })
      .catch(() => {
        // Keep browser media-query fallback when native theme subscription fails.
      });

    return () => {
      disposed = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    // Update document class and localStorage
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
    localStorage.setItem('theme-mode', themeMode);
  }, [theme, themeMode]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const appWindow = getCurrentWindow();
    const windowTheme: TauriTheme | null = themeMode === 'system' ? null : theme;

    void appWindow.setTheme(windowTheme).catch(() => {
      // Keep web theme behavior even if native theme sync is unavailable.
    });
  }, [theme, themeMode]);

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === 'dark') {
        return 'light';
      }
      if (prev === 'light') {
        return 'dark';
      }
      return theme === 'dark' ? 'light' : 'dark';
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeModeState(newTheme);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return {
    theme: context.theme,
    themeMode: context.themeMode,
    toggleTheme: context.toggleTheme,
    setTheme: context.setTheme,
    setThemeMode: context.setThemeMode,
  };
}

