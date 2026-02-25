import { ALERTS_COPY } from './copy/alerts';
import { COMMON_COPY } from './copy/common';
import { DASHBOARD_COPY } from './copy/dashboard';
import { DEVICES_COPY } from './copy/devices';
import { HEADER_COPY } from './copy/header';
import { REPORTS_COPY } from './copy/reports';
import { ROUTER_CONTROL_COPY } from './copy/router-control';
import { SETTINGS_COPY } from './copy/settings';
import { SIDEBAR_COPY } from './copy/sidebar';
import { TOOLS_COPY } from './copy/tools';
import { TOPOLOGY_COPY } from './copy/topology';
import { VULNERABILITIES_COPY } from './copy/vulnerabilities';
import {
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_APP_LANGUAGE,
  type AppCopy,
  type AppLanguage,
} from './copy/types';

export { APP_LANGUAGE_STORAGE_KEY, DEFAULT_APP_LANGUAGE };
export type { AppCopy, AppLanguage };

export const APP_COPY: Record<AppLanguage, AppCopy> = {
  en: {
    common: COMMON_COPY.en,
    header: HEADER_COPY.en,
    sidebar: SIDEBAR_COPY.en,
    dashboard: DASHBOARD_COPY.en,
    reports: REPORTS_COPY.en,
    settings: SETTINGS_COPY.en,
    topology: TOPOLOGY_COPY.en,
    devices: DEVICES_COPY.en,
    vulnerabilities: VULNERABILITIES_COPY.en,
    alerts: ALERTS_COPY.en,
    tools: TOOLS_COPY.en,
    routerControl: ROUTER_CONTROL_COPY.en,
  },
  my: {
    common: COMMON_COPY.my,
    header: HEADER_COPY.my,
    sidebar: SIDEBAR_COPY.my,
    dashboard: DASHBOARD_COPY.my,
    reports: REPORTS_COPY.my,
    settings: SETTINGS_COPY.my,
    topology: TOPOLOGY_COPY.my,
    devices: DEVICES_COPY.my,
    vulnerabilities: VULNERABILITIES_COPY.my,
    alerts: ALERTS_COPY.my,
    tools: TOOLS_COPY.my,
    routerControl: ROUTER_CONTROL_COPY.my,
  },
};

export function resolveLanguageCopy(language: AppLanguage): AppCopy {
  return APP_COPY[language] ?? APP_COPY[DEFAULT_APP_LANGUAGE];
}
