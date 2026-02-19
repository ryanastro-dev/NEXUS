export const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;

export const REFRESH_EVENT_TYPES = new Set([
  'ScanCompleted',
  'NewDeviceDiscovered',
  'DeviceCameOnline',
  'DeviceWentOffline',
  'DeviceIpChanged',
]);
