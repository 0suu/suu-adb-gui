import { create } from "zustand";
import type { DeviceDisplayNameMap, DeviceSummary } from "../lib/types";

type DeviceStore = {
  devices: DeviceSummary[];
  selectedSerial: string | null;
  terminalSerials: string[];
  displayNames: DeviceDisplayNameMap;
  setDevices: (devices: DeviceSummary[]) => void;
  selectDevice: (serial: string | null) => void;
  toggleTerminalSerial: (serial: string) => void;
  setTerminalSerials: (serials: string[]) => void;
  setDisplayNames: (displayNames: DeviceDisplayNameMap) => void;
};

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  selectedSerial: null,
  terminalSerials: [],
  displayNames: {},
  setDevices: (devices) =>
    set((state) => ({
      devices,
      terminalSerials: state.terminalSerials.filter((s) =>
        devices.some((d) => d.serial === s)
      ),
    })),
  // 通常クリック: primary 選択 + terminalSerials をそのデバイス単体にリセット
  selectDevice: (serial) =>
    set({
      selectedSerial: serial,
      terminalSerials: serial ? [serial] : [],
    }),
  // Ctrl+クリック: primary 選択を変えずに追加の terminal 対象をトグル
  toggleTerminalSerial: (serial) =>
    set((state) => {
      if (state.selectedSerial === serial) {
        return state;
      }

      return {
        terminalSerials: state.terminalSerials.includes(serial)
          ? state.terminalSerials.filter((s) => s !== serial)
          : [...state.terminalSerials, serial],
      };
    }),
  // Shift+クリック: 範囲選択で terminal 対象を一括セット
  setTerminalSerials: (serials) => set({ terminalSerials: serials }),
  setDisplayNames: (displayNames) => set({ displayNames }),
}));
