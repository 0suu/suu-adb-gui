import { create } from "zustand";
import type { OperationLog } from "../lib/types";

type LogStore = {
  logs: OperationLog[];
  addLog: (log: OperationLog) => void;
  clearLogs: () => void;
};

let logIdCounter = 0;

export const createLog = (
  commandType: string,
  serial: string,
  success: boolean,
  detail: string
): OperationLog => ({
  id: String(++logIdCounter),
  commandType,
  serial,
  timestamp: new Date().toLocaleString("ja-JP"),
  success,
  detail,
});

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
  clearLogs: () => set({ logs: [] }),
}));
