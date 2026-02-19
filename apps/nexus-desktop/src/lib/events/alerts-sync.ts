import type { AlertRecord } from "../api/types";

export const ALERTS_UNREAD_COUNT_EVENT = "alerts-unread-count-changed";

export interface AlertsUnreadCountDetail {
  unreadCount: number;
  totalCount: number;
}

export function emitAlertsUnreadCount(alerts: AlertRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const unreadCount = alerts.filter((alert) => !alert.is_read).length;
  window.dispatchEvent(
    new CustomEvent<AlertsUnreadCountDetail>(ALERTS_UNREAD_COUNT_EVENT, {
      detail: {
        unreadCount,
        totalCount: alerts.length,
      },
    }),
  );
}

