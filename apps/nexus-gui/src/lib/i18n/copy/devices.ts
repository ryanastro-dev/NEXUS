import type { AppLanguage, DevicesCopy } from './types';
import { DEVICES_COPY_EN } from './en/devices';
import { DEVICES_COPY_MY } from './my/devices';

export const DEVICES_COPY: Record<AppLanguage, DevicesCopy> = {
  en: DEVICES_COPY_EN,
  my: DEVICES_COPY_MY,
};
