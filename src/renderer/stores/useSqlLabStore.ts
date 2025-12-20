import { create } from 'zustand'

export interface SqlLabSession {
  mode: 'widget' | 'file'
  targetId: string // widgetId or tableName
  targetTitle?: string // <--- Added
  initialSql: string
  initialColumns?: string[]
  initialColumnTypes?: Record<string, string>
  onSave?: (sql: string) => Promise<void>
}

interface SqlLabState {
  session: SqlLabSession | null
  open: (session: SqlLabSession) => void
  close: () => void
}

export const useSqlLabStore = create<SqlLabState>(set => ({
  session: null,
  open: session => set({ session }),
  close: () => set({ session: null }),
}))
