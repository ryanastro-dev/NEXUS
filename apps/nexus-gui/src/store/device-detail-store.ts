import { create } from "zustand";

import type { HostInfo } from "../lib/api/types";

interface DeviceDetailStoreState {
  selectedDevice: HostInfo | null;
  openDeviceDetails: (device: HostInfo) => void;
  closeDeviceDetails: () => void;
}

export const useDeviceDetailStore = create<DeviceDetailStoreState>((set) => ({
  selectedDevice: null,
  openDeviceDetails: (device) => set({ selectedDevice: device }),
  closeDeviceDetails: () => set({ selectedDevice: null }),
}));
