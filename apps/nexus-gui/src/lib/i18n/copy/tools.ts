import type { AppLanguage, ToolsCopy } from './types';
import { TOOLS_COPY_EN } from './en/tools';
import { TOOLS_COPY_MY } from './my/tools';

export const TOOLS_COPY: Record<AppLanguage, ToolsCopy> = {
  en: TOOLS_COPY_EN,
  my: TOOLS_COPY_MY,
};
