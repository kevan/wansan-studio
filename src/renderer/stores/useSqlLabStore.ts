import { create } from 'zustand'

export interface SqlLabSession {
  mode: 'widget' | 'file'
  targetId: string // widgetId or tableName
  targetTitle?: string // <--- Added
  initialSql: string
  reasoning?: string
  onSave?: (sql: string) => Promise<void>
}

interface SqlLabState {
  session: SqlLabSession | null
  open: (session: SqlLabSession) => void
  close: () => void
}

export const useSqlLabStore = create<SqlLabState>(() => ({
  session: null,
  open: session => useSqlLabStore.setState({ session }),
  close: () => useSqlLabStore.setState({ session: null }),
}))
