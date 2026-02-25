import type { AppLanguage, DashboardCopy } from './types';
import { DASHBOARD_COPY_EN } from './en/dashboard';
import { DASHBOARD_COPY_MY } from './my/dashboard';

export const DASHBOARD_COPY: Record<AppLanguage, DashboardCopy> = {
  en: DASHBOARD_COPY_EN,
  my: DASHBOARD_COPY_MY,
};
