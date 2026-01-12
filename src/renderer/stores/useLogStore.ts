import { create } from 'zustand'
import { get, set, update } from 'idb-keyval'

export interface LogEntry {
  timestamp: string
  type: 'error' | 'warn' | 'info'
  message: string
  stack?: string
}

interface LogStore {
  // We don't keep full history in RAM, just a small buffer for UI if needed
  // For now, this store mainly acts as an an interface to IDB
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => Promise<void>
  getAllLogs: () => Promise<LogEntry[]>
  clearLogs: () => Promise<void>
}

const LOG_KEY = 'wansan_sys_logs'
const MAX_LOGS = 200 // Hard Limit

export const useLogStore = create<LogStore>(() => ({
  addLog: async entry => {
    if (entry.type !== 'error') return

    const fullEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    }

    try {
      // Atomic-like update in IDB
      await update(LOG_KEY, oldVal => {
        const currentLogs = (oldVal as LogEntry[]) || []
        // Prepend new log, then Slice to keep only top N
        const newLogs = [fullEntry, ...currentLogs]
        return newLogs.slice(0, MAX_LOGS)
      })
    } catch (e) {
      console.error('Failed to write log', e)
    }
  },

  getAllLogs: async () => {
    try {
      return (await get<LogEntry[]>(LOG_KEY)) || []
    } catch (e) {
      console.error('Failed to read logs', e)
      return []
    }
  },

  clearLogs: async () => {
    try {
      await set(LOG_KEY, [])
    } catch (e) {
      console.error('Failed to clear logs', e)
    }
  },
}))
