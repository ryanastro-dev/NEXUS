/**
 * useSidebarCollapse Hook
 * Manages sidebar collapsed state with localStorage persistence
 */

import { useState, useEffect } from 'react';

const SIDEBAR_STORAGE_KEY = 'netmapper-sidebar-collapsed';

type IdleCallbackHandle = number;
type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleCallback) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Persist to localStorage when changed
    const persist = () => {
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
      } catch {
        // Ignore persistence failures to keep UI responsive.
      }
    };

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => persist());
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(persist, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isCollapsed]);

  const toggle = () => setIsCollapsed((prev) => !prev);

  return { isCollapsed, toggle };
}
