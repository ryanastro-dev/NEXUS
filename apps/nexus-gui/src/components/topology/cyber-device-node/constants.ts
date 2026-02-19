import type { MetricThreshold } from './types';

export const CPU_THRESHOLD: MetricThreshold = { warning: 60, danger: 80 };
export const MEMORY_THRESHOLD: MetricThreshold = { warning: 70, danger: 85 };
export const DISK_THRESHOLD: MetricThreshold = { warning: 70, danger: 90 };
