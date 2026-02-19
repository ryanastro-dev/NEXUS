export {
  extractNewDeviceData,
  extractScanCompleteData,
  reduceMonitoringState,
} from './event-processing';
export { formatEventMessage, getEventStyle } from './helpers';
export { resolvePreferredInterface } from './preferred-interface';
export { createInitialMonitoringState, initialStatus } from './state';
export type {
  MonitoringState,
  MonitoringStatus,
  NetworkEventType,
  UnlistenFn,
  UseMonitoringOptions,
  UseMonitoringReturn,
} from './types';
