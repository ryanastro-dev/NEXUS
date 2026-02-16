import { useEffect, useState } from 'react';

import { eventClient } from '../../../lib/api/event-client';
import { isTauri } from '../../../lib/runtime/is-tauri';
import { eventToStreamEntry, nextStreamStateLabel } from './event-utils';
import type { StreamEvent, UnlistenFn } from './types';

const MAX_STREAM_EVENTS = 80;

interface UseTrafficStreamOptions {
  visible: boolean;
  hasScanData: boolean;
}

interface UseTrafficStreamResult {
  events: StreamEvent[];
  streamConnected: boolean;
  streamStateLabel: string;
}

export function useTrafficStream({
  visible,
  hasScanData,
}: UseTrafficStreamOptions): UseTrafficStreamResult {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamStateLabel, setStreamStateLabel] = useState('IDLE');

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!isTauri()) {
      setStreamConnected(false);
      setStreamStateLabel('UNAVAILABLE');
      return;
    }

    let unlisten: UnlistenFn | null = null;
    let disposed = false;

    const setup = async () => {
      try {
        const unsubscribe = await eventClient.listenNetworkEvents((payload) => {
          setEvents((previousEvents) =>
            [...previousEvents, eventToStreamEntry(payload)].slice(-MAX_STREAM_EVENTS),
          );
          setStreamStateLabel((currentLabel) =>
            nextStreamStateLabel(currentLabel, payload, hasScanData),
          );
        });

        if (disposed) {
          unsubscribe();
          return;
        }

        unlisten = unsubscribe;
        setStreamConnected(true);
        setStreamStateLabel((currentLabel) =>
          currentLabel === 'UNAVAILABLE' ? 'CONNECTED' : currentLabel,
        );
      } catch {
        setStreamConnected(false);
        setStreamStateLabel('UNAVAILABLE');
      }
    };

    void setup();

    return () => {
      disposed = true;
      if (unlisten) {
        unlisten();
      }
      setStreamConnected(false);
    };
  }, [visible, hasScanData]);

  return {
    events,
    streamConnected,
    streamStateLabel,
  };
}
