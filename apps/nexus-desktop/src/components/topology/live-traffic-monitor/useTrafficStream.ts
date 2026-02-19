import { useEffect, useState } from 'react';

import { eventClient } from '../../../lib/api/event-client';
import type { NetworkEventType } from '../../../lib/api/types';
import { isTauri } from '../../../lib/runtime/is-tauri';
import {
  buildSessionSeparatorEntry,
  engineEventToStreamEntry,
  eventToStreamEntry,
  nextStreamStateLabel,
} from './event-utils';
import type { StreamEvent, UnlistenFn } from './types';

const MAX_STREAM_EVENTS = 240;

// Session-persistent in-memory store (clears only on app refresh/restart).
let sessionEvents: StreamEvent[] = [];
let sessionStreamConnected = false;
let sessionStreamStateLabel = 'IDLE';

interface UseTrafficStreamOptions {
  visible: boolean;
  hasScanData: boolean;
}

interface UseTrafficStreamResult {
  events: StreamEvent[];
  streamConnected: boolean;
  streamStateLabel: string;
}

function shouldInsertSeparator(payload: NetworkEventType, previousEvents: StreamEvent[]): boolean {
  if (previousEvents.length === 0) {
    return false;
  }

  if (payload.type !== 'ScanStarted' && payload.type !== 'MonitoringStarted') {
    return false;
  }

  // Avoid separator duplication if event dispatch retries happen quickly.
  const lastEvent = previousEvents[previousEvents.length - 1];
  return lastEvent.variant !== 'separator';
}

function separatorTitle(payload: NetworkEventType): string {
  if (payload.type === 'ScanStarted') {
    return `New Scan Started (#${payload.data.scan_number})`;
  }

  if (payload.type === 'MonitoringStarted') {
    return `Monitoring Session Started (${payload.data.interval_seconds}s interval)`;
  }

  return 'New Activity Session Started';
}

export function useTrafficStream({
  visible,
  hasScanData,
}: UseTrafficStreamOptions): UseTrafficStreamResult {
  const [events, setEvents] = useState<StreamEvent[]>(() => sessionEvents);
  const [streamConnected, setStreamConnected] = useState<boolean>(() => sessionStreamConnected);
  const [streamStateLabel, setStreamStateLabel] = useState<string>(() => sessionStreamStateLabel);

  const appendEvents = (newEntries: StreamEvent[]) => {
    setEvents((previousEvents) => {
      const nextEvents = [...previousEvents, ...newEntries].slice(-MAX_STREAM_EVENTS);
      sessionEvents = nextEvents;
      return nextEvents;
    });
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!isTauri()) {
      sessionStreamConnected = false;
      sessionStreamStateLabel = 'UNAVAILABLE';
      setStreamConnected(false);
      setStreamStateLabel('UNAVAILABLE');
      return;
    }

    let unlistenNetwork: UnlistenFn | null = null;
    let unlistenEngine: UnlistenFn | null = null;
    let disposed = false;

    const setup = async () => {
      try {
        const unsubscribeNetwork = await eventClient.listenNetworkEvents((payload) => {
          setEvents((previousEvents) => {
            const pendingEntries: StreamEvent[] = [];
            if (shouldInsertSeparator(payload, previousEvents)) {
              pendingEntries.push(buildSessionSeparatorEntry(separatorTitle(payload)));
            }
            pendingEntries.push(eventToStreamEntry(payload));

            const nextEvents = [...previousEvents, ...pendingEntries].slice(-MAX_STREAM_EVENTS);
            sessionEvents = nextEvents;
            return nextEvents;
          });

          setStreamStateLabel((currentLabel) => {
            const nextLabel = nextStreamStateLabel(currentLabel, payload, hasScanData);
            sessionStreamStateLabel = nextLabel;
            return nextLabel;
          });

          setStreamConnected(() => {
            sessionStreamConnected = true;
            return true;
          });
        });

        if (disposed) {
          unsubscribeNetwork();
          return;
        }

        unlistenNetwork = unsubscribeNetwork;

        try {
          const unsubscribeEngine = await eventClient.listenEngineEvents((payload) => {
            appendEvents([engineEventToStreamEntry(payload)]);
            setStreamConnected((current) => {
              if (!current) {
                sessionStreamConnected = true;
              }
              return true;
            });
          });

          if (disposed) {
            unsubscribeEngine();
            return;
          }

          unlistenEngine = unsubscribeEngine;
        } catch {
          // Keep monitor functional even if engine-event channel is unavailable.
        }

        sessionStreamConnected = true;
        setStreamConnected(true);

        setStreamStateLabel((currentLabel) => {
          const nextLabel = currentLabel === 'UNAVAILABLE' ? 'CONNECTED' : currentLabel;
          sessionStreamStateLabel = nextLabel;
          return nextLabel;
        });
      } catch {
        sessionStreamConnected = false;
        sessionStreamStateLabel = 'UNAVAILABLE';
        setStreamConnected(false);
        setStreamStateLabel('UNAVAILABLE');
      }
    };

    void setup();

    return () => {
      disposed = true;
      if (unlistenNetwork) {
        unlistenNetwork();
      }
      if (unlistenEngine) {
        unlistenEngine();
      }
      // Preserve session logs and label across remounts/navigation.
      sessionStreamConnected = false;
      setStreamConnected(false);
    };
  }, [visible, hasScanData]);

  useEffect(() => {
    sessionEvents = events;
  }, [events]);

  useEffect(() => {
    sessionStreamConnected = streamConnected;
  }, [streamConnected]);

  useEffect(() => {
    sessionStreamStateLabel = streamStateLabel;
  }, [streamStateLabel]);

  useEffect(() => {
    if (!hasScanData) {
      return;
    }

    if (streamStateLabel !== 'SCANNING') {
      return;
    }

    sessionStreamStateLabel = 'CONNECTED';
    setStreamStateLabel('CONNECTED');
  }, [hasScanData, streamStateLabel]);

  return {
    events,
    streamConnected,
    streamStateLabel,
  };
}
