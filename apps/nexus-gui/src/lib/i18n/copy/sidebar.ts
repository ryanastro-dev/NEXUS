import type { AppLanguage, SidebarCopy } from './types';
import { SIDEBAR_COPY_EN } from './en/sidebar';
import { SIDEBAR_COPY_MY } from './my/sidebar';

export const SIDEBAR_COPY: Record<AppLanguage, SidebarCopy> = {
  en: SIDEBAR_COPY_EN,
  my: SIDEBAR_COPY_MY,
};
