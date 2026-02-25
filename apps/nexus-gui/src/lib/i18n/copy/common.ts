import type { AppLanguage, CommonCopy } from './types';
import { COMMON_COPY_EN } from './en/common';
import { COMMON_COPY_MY } from './my/common';

export const COMMON_COPY: Record<AppLanguage, CommonCopy> = {
  en: COMMON_COPY_EN,
  my: COMMON_COPY_MY,
};
