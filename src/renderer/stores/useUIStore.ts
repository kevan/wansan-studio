import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  mainPanelLayout: number[] // [sidebar, chat, dashboard]
  lastSplitLayout: number[] // Remember split ratios [sidebar, chat, dashboard]
  migrationState: {
    isMigrating: boolean
    progress: number
    total: number
    message: string
  }
  setMainPanelLayout: (layout: number[]) => void
  setLastSplitLayout: (layout: number[]) => void
  setMigrationState: (state: Partial<UIState['migrationState']>) => void
  resetLayout: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      mainPanelLayout: [20, 35, 45], // Default layout percentages
      lastSplitLayout: [20, 35, 45], // Default split memory
      migrationState: {
        isMigrating: false,
        progress: 0,
        total: 0,
        message: '',
      },
      setMainPanelLayout: layout => set({ mainPanelLayout: layout }),
      setLastSplitLayout: layout => set({ lastSplitLayout: layout }),
      setMigrationState: state =>
        set(prev => ({ migrationState: { ...prev.migrationState, ...state } })),
      resetLayout: () =>
        set({
          mainPanelLayout: [20, 35, 45],
          lastSplitLayout: [20, 35, 45],
        }),
    }),
    {
      name: 'wansan-ui-state',
    }
  )
)
