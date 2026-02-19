import { useEffect, useState } from 'react';

import type { HostInfo } from '../../../hooks/useScan';
import type { DeviceRecord } from '../../../lib/api/types';
import { tauriClient } from '../../../lib/api/tauri-client';

export function usePersistedDevice(device: HostInfo | null) {
  const [persistedDevice, setPersistedDevice] = useState<DeviceRecord | null>(null);

  useEffect(() => {
    if (!device) {
      setPersistedDevice(null);
      return;
    }

    let mounted = true;

    tauriClient
      .getDeviceByMac(device.mac)
      .then((result) => {
        if (mounted) {
          setPersistedDevice(result);
        }
      })
      .catch(() => {
        if (mounted) {
          setPersistedDevice(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [device]);

  return persistedDevice;
}
