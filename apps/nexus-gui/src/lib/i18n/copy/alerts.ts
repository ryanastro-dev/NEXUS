import type { AppLanguage, AlertsCopy } from './types';
import { ALERTS_COPY_EN } from './en/alerts';
import { ALERTS_COPY_MY } from './my/alerts';

export const ALERTS_COPY: Record<AppLanguage, AlertsCopy> = {
  en: ALERTS_COPY_EN,
  my: ALERTS_COPY_MY,
};
