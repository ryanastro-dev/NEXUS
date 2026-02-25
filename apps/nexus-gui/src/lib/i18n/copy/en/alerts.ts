import type { AlertsCopy } from '../types';

export const ALERTS_COPY_EN: AlertsCopy = {
      header: {
        kicker: 'Security Events',
        title: 'Alert Center',
        noData: 'No scan events yet.',
        subtitle:
          'Prioritize critical events, triage warnings, and resolve network security findings.',
        refresh: 'Refresh',
      },
      emptyState: {
        headline: 'Alerts are ready to stream',
        description:
          'Start a network scan to populate security alerts, device events, and triage signals.',
        hintTauri: 'Use the top-right Start Scan button to begin.',
        hintBrowser: 'Run with npm run tauri dev to enable scanning.',
      },
      scanningState: {
        subtitle: 'Scanning and collecting live events...',
        headline: 'Building your alert timeline...',
        description: 'Gathering discovery events and security signals in real time.',
      },
      stats: {
        unread: 'Unread Alerts',
        critical: 'Critical',
        warnings: 'Warnings',
        total: 'Total',
      },
      toolbar: {
        critical: 'Critical',
        warnings: 'Warnings',
        info: 'Info',
        unread: 'Unread',
        markAllRead: 'Mark all read',
        clearAll: 'Clear all',
      },
      list: {
        loading: 'Loading alerts...',
        allClearTitle: 'All Clear!',
        noAlertsYet: 'No alerts yet. Your network is being monitored.',
        noFilterMatch: 'No alerts match your current filter.',
        new: 'NEW',
        markAsRead: 'Mark as Read',
      },
      footer: {
        showingOf: 'Showing {shown} of {total} alerts',
      },
      relativeTime: {
        justNow: 'Just now',
        minutesAgo: '{count}m ago',
        hoursAgo: '{count}h ago',
        daysAgo: '{count}d ago',
      },
    };
