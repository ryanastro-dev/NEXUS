import type { EngineEventType } from '../../../lib/api/types';

export function formatEngineEvent(
  event: EngineEventType,
  copy: {
    warningPrefix: string;
    errorPrefix: string;
    phasePrefix: string;
    persistedPrefix: string;
    cancelledPrefix: string;
    unknownEvent: string;
  },
): string {
  switch (event.kind) {
    case 'info':
      return event.message;
    case 'warn':
      return `${copy.warningPrefix} ${event.message}`;
    case 'error':
      return `${copy.errorPrefix} ${event.message}`;
    case 'scan_phase':
      return copy.phasePrefix
        .replace('{phase}', event.phase)
        .replace('{progress}', String(event.progress_pct));
    case 'scan_persisted':
      return copy.persistedPrefix.replace('{scanId}', String(event.scan_id));
    case 'cancelled':
      return copy.cancelledPrefix.replace('{stage}', event.stage);
    default:
      return copy.unknownEvent;
  }
}
