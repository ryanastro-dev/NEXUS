import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  EngineEventType,
  NetworkEventType,
  TelemetryEvent,
} from "./types";
import { isTauri } from "../runtime/is-tauri";

async function listenSafe<T>(
  eventName: string,
  handler: (payload: T) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<T>(eventName, (event) => {
    handler(event.payload);
  });
}

export const eventClient = {
  listenNetworkEvents(handler: (payload: NetworkEventType) => void) {
    return listenSafe<NetworkEventType>("network-event", handler);
  },
  listenEngineEvents(handler: (payload: EngineEventType) => void) {
    return listenSafe<EngineEventType>("engine-event", handler);
  },
  listenTelemetryEvents(handler: (payload: TelemetryEvent) => void) {
    return listenSafe<TelemetryEvent>("telemetry-event", handler);
  },
};
