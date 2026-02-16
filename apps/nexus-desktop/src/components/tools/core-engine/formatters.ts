import type { EngineEventType } from '../../../lib/api/types';

export function formatEngineEvent(event: EngineEventType): string {
  switch (event.kind) {
    case 'info':
      return event.message;
    case 'warn':
      return `Warning: ${event.message}`;
    case 'error':
      return `Error: ${event.message}`;
    case 'scan_phase':
      return `Phase ${event.phase}: ${event.progress_pct}%`;
    case 'scan_persisted':
      return `Scan persisted (#${event.scan_id})`;
    case 'cancelled':
      return `Cancelled during ${event.stage}`;
    default:
      return 'Unknown engine event';
  }
}
