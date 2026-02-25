import type { AppLanguage, VulnerabilitiesCopy } from './types';
import { VULNERABILITIES_COPY_EN } from './en/vulnerabilities';
import { VULNERABILITIES_COPY_MY } from './my/vulnerabilities';

export const VULNERABILITIES_COPY: Record<AppLanguage, VulnerabilitiesCopy> = {
  en: VULNERABILITIES_COPY_EN,
  my: VULNERABILITIES_COPY_MY,
};
