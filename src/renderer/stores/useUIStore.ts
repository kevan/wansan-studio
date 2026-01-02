import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarLayout: number[] // [sidebar, main_content]
  contentLayout: number[] // [chat, dashboard]
  lastContentSplit: number[] // Remember split ratios [chat, dashboard]
  migrationState: {
    isMigrating: boolean
    progress: number
    total: number
    message: string
  }
  setSidebarLayout: (layout: number[]) => void
  setContentLayout: (layout: number[]) => void
  setLastContentSplit: (layout: number[]) => void
  setMigrationState: (state: Partial<UIState['migrationState']>) => void
  resetLayout: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      sidebarLayout: [20, 80],
      contentLayout: [40, 60],
      lastContentSplit: [40, 60],
      migrationState: {
        isMigrating: false,
        progress: 0,
        total: 0,
        message: '',
      },
      setSidebarLayout: layout => set({ sidebarLayout: layout }),
      setContentLayout: layout => set({ contentLayout: layout }),
      setLastContentSplit: layout => set({ lastContentSplit: layout }),
      setMigrationState: state =>
        set(prev => ({ migrationState: { ...prev.migrationState, ...state } })),
      resetLayout: () =>
        set({
          sidebarLayout: [20, 80],
          contentLayout: [40, 60],
          lastContentSplit: [40, 60],
        }),
    }),
    {
      name: 'wansan-ui-state',
    }
  )
)
