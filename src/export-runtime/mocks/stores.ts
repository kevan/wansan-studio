import { create } from 'zustand'

// Mock Workbench Store for Export Runtime
export const useWorkbenchStore = create((set) => ({
  // Default State
  canvasConfig: { zoom: 100, layout: 'a4', title: 'Report' },
  pageCount: 1,
  layoutScenario: 'default',
  pinnedReports: [],
  
  // Actions (No-op or simple updates for local interaction like Zoom)
  setCanvasConfig: (updates: any) => set((state: any) => ({ canvasConfig: { ...state.canvasConfig, ...updates } })),
  setPageCount: (count: number) => set({ pageCount: count }),
  setLayoutScenario: (scenario: any) => set({ layoutScenario: scenario }),
  
  // Placeholders
  pinReport: () => {},
  removeReport: () => {},
  updateReportTitle: () => {},
  updateReportConfig: () => {},
  updateLayout: () => {},
  updateGlobalLayout: () => {},
  moveWidgetToPage: () => {},
  incrementPageCount: () => {},
  setEditingReportId: () => {},
  reset: () => {},
}))

// Mock Project Store
export const useProjectStore = create((set) => ({
  widgetRegistry: {},
  files: [],
  sessions: [],
  domainRules: [],
  // ... add actions if needed
}))

// Mock UI Store
export const useUIStore = create((set) => ({
  contentLayout: 'vertical',
  sidebarLayout: 'visible',
}))

// Mock Chat Store
export const useChatStore = create((set) => ({
    messages: [],
    sendMessage: () => {},
    setReplyTo: () => {}
}))

// Mock Settings Store (needed for language)
export const useSettingsStore = create((set) => ({
    language: 'en',
    isActivated: true, // Pretend pro for best view
}))

export const useSqlLabStore = create((set) => ({
    session: null,
    open: () => {},
    close: () => {}
}))

export const useToastStore = create((set) => ({
    addToast: () => {}
}))
