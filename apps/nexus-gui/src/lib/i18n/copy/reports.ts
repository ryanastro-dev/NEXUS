import type { AppLanguage, ReportsCopy } from './types';
import { REPORTS_COPY_EN } from './en/reports';
import { REPORTS_COPY_MY } from './my/reports';

export const REPORTS_COPY: Record<AppLanguage, ReportsCopy> = {
  en: REPORTS_COPY_EN,
  my: REPORTS_COPY_MY,
};
