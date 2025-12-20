import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  mainPanelLayout: number[] // [sidebar, chat, dashboard]
  setMainPanelLayout: (layout: number[]) => void
  resetLayout: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      mainPanelLayout: [20, 35, 45], // Default layout percentages
      setMainPanelLayout: layout => set({ mainPanelLayout: layout }),
      resetLayout: () => set({ mainPanelLayout: [20, 35, 45] }),
    }),
    {
      name: 'wansan-ui-state',
    }
  )
)
