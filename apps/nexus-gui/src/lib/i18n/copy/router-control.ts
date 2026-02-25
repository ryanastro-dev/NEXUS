import type { AppLanguage, RouterControlCopy } from './types';
import { ROUTER_CONTROL_COPY_EN } from './en/router-control';
import { ROUTER_CONTROL_COPY_MY } from './my/router-control';

export const ROUTER_CONTROL_COPY: Record<AppLanguage, RouterControlCopy> = {
  en: ROUTER_CONTROL_COPY_EN,
  my: ROUTER_CONTROL_COPY_MY,
};
