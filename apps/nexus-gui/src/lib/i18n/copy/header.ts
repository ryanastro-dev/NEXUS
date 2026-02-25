import type { AppLanguage, HeaderCopy } from './types';
import { HEADER_COPY_EN } from './en/header';
import { HEADER_COPY_MY } from './my/header';

export const HEADER_COPY: Record<AppLanguage, HeaderCopy> = {
  en: HEADER_COPY_EN,
  my: HEADER_COPY_MY,
};
