import type { AppLanguage, SettingsCopy } from './types';
import { SETTINGS_COPY_EN } from './en/settings';
import { SETTINGS_COPY_MY } from './my/settings';

export const SETTINGS_COPY: Record<AppLanguage, SettingsCopy> = {
  en: SETTINGS_COPY_EN,
  my: SETTINGS_COPY_MY,
};
