import type { AppLanguage, TopologyCopy } from './types';
import { TOPOLOGY_COPY_EN } from './en/topology';
import { TOPOLOGY_COPY_MY } from './my/topology';

export const TOPOLOGY_COPY: Record<AppLanguage, TopologyCopy> = {
  en: TOPOLOGY_COPY_EN,
  my: TOPOLOGY_COPY_MY,
};
