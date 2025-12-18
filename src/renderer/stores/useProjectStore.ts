import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ProjectData, Session } from '@shared/types/project'
import { Message } from '@shared/types/chat'
import { ReportWidget, ReportData } from '@shared/types/dashboard'
import { FileNode } from '@shared/types'
import { Layout } from 'react-grid-layout'
import { useFileStore } from './useFileStore'
import { createBigIntStorage } from '@shared/serialization'

export type LayoutScenario = 'default' | 'print' | 'large' | 'ppt' | 'email'
export type Language = 'en' | 'zh'

interface ProjectState extends ProjectData {
  // Transient State
  abortControllers: Record<string, AbortController>
  layoutScenario: LayoutScenario
  editingReportId: string | null
  language: Language
  pendingReplace: { fileId: string; newPath: string; missing: string[] } | null
  showRefreshConfirm: boolean

  // --- Actions ---

  // 1. Session Management
  createSession: () => void
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void

  // 2. Chat Actions (Targeting Active Session)
  // Accepts denormalized message (with reportData) and normalizes it
  addMessage: (msg: Message & { reportData?: ReportData }) => void
  updateMessage: (id: string, update: Partial<Message> & { reportData?: Partial<ReportData> }) => void
  deleteMessage: (id: string) => void
  setReplyTo: (replyToId: string | null) => void
  setAbortController: (controller: AbortController | null) => void

  // 3. Dashboard Actions (Targeting Active Session)
  addWidget: (widget: ReportWidget & { reportData?: ReportData }) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, update: Partial<ReportWidget> | ((w: ReportWidget) => ReportWidget)) => void
  updateWidgetData: (id: string, update: Partial<ReportData>) => void
  updateLayout: (layout: any) => void
  updateReportTitle: (id: string, title: string) => void
  setCanvasConfig: (config: any) => void
  
  // 4. UI Actions
  setLayoutScenario: (scenario: LayoutScenario) => void
  setEditingReportId: (id: string | null) => void
  setLanguage: (lang: Language) => void
  setPendingReplace: (payload: { fileId: string; newPath: string; missing: string[] } | null) => void
  setShowRefreshConfirm: (open: boolean) => void
  confirmReplace: () => Promise<void>
  refreshSessionWidgets: () => Promise<void>

  // 5. File Actions (Global)
  addFile: (file: FileNode) => void
  removeFile: (id: string) => void
  replaceFile: (fileId: string, newPath: string, force?: boolean) => Promise<'completed' | 'pending' | 'error'>

  // 6. IO
  loadProject: (data: ProjectData) => void
  serialize: () => string
  reset: () => void
}

const createNewSession = (): Session => ({
  id: crypto.randomUUID(),
  title: 'New Session',
  createdAt: Date.now(),
  lastModified: Date.now(),
  messages: [],
  replyToId: undefined,
  dashboard: {
    widgets: [],
    layoutMode: 'a4',
    pageCount: 1,
    zoom: 80,
  },
})

const initialProjectState: ProjectData = {
  meta: {
    id: crypto.randomUUID(),
    name: 'Untitled Project',
    version: '1.1.0',
    created: Date.now(),
  },
  files: [],
  relations: [],
  sessions: [],
  activeSessionId: '',
  widgetRegistry: {},
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...initialProjectState,
      abortControllers: {},
      layoutScenario: 'default',
      editingReportId: null,
      language: 'en',
      pendingReplace: null,
      showRefreshConfirm: false,

      setPendingReplace: (payload) => set({ pendingReplace: payload }),
      setShowRefreshConfirm: (open) => set({ showRefreshConfirm: open }),

      refreshSessionWidgets: async () => {
          const state = get()
          const session = state.sessions.find(s => s.id === state.activeSessionId)
          if (!session) return

          let updatedRegistry = { ...state.widgetRegistry }
          let hasUpdates = false

          await Promise.all(session.dashboard.widgets.map(async (w) => {
             const reportData = updatedRegistry[w.widgetId]
             if (!reportData?.sql) return

             try {
               const res = await window.electronAPI.runSQL(reportData.sql)
               if (res.success && res.data) {
                   updatedRegistry[w.widgetId] = {
                       ...reportData,
                       tableData: res.data,
                       timestamp: Date.now()
                   }
                   hasUpdates = true
               }
             } catch (e) { 
                 console.error('Widget refresh failed', w.id, e)
             }
          }))

          if (hasUpdates) {
              set({ widgetRegistry: updatedRegistry })
          }
      },

      confirmReplace: async () => {
          const { pendingReplace, replaceFile } = get()
          if (!pendingReplace) return
          
          const status = await replaceFile(pendingReplace.fileId, pendingReplace.newPath, true)
          set({ pendingReplace: null })
          
          if (status === 'completed') {
              set({ showRefreshConfirm: true })
          }
      },

      createSession: () =>
        set(state => {
          const newSession = createNewSession()
          
          // Add Default Title Widget
          const titleWidgetId = crypto.randomUUID()
          const reportId = crypto.randomUUID()
          
          const defaultTitleWidget: ReportWidget = {
              id: reportId,
              sourceMessageId: 'system',
              widgetId: titleWidgetId,
              layout: { i: reportId, x: 0, y: 0, w: 12, h: 2 },
              pageIndex: 0
          }
          
          const defaultTitleData: ReportData = {
              title: 'Report Title',
              content: 'Untitled Report',
              chartType: 'text',
              timestamp: Date.now()
          }
          
          newSession.dashboard.widgets.push(defaultTitleWidget)

          return {
            widgetRegistry: {
                ...state.widgetRegistry,
                [titleWidgetId]: defaultTitleData
            },
            sessions: [...state.sessions, newSession],
            activeSessionId: newSession.id,
          }
        }),

      switchSession: (id: string) =>
        set(state => {
          if (state.sessions.some(s => s.id === id)) {
            return { activeSessionId: id }
          }
          return state
        }),

      deleteSession: (id: string) =>
        set(state => {
          const newSessions = state.sessions.filter(s => s.id !== id)
          let newActiveId = state.activeSessionId
          if (id === state.activeSessionId) {
            newActiveId = newSessions.length > 0 ? newSessions[0].id : ''
          }
          
          const { [id]: _, ...remainingControllers } = state.abortControllers

          return {
            sessions: newSessions,
            activeSessionId: newActiveId,
            abortControllers: remainingControllers
          }
        }),

      renameSession: (id: string, name: string) =>
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === id ? { ...s, title: name, lastModified: Date.now() } : s
          ),
        })),

      addMessage: (msg) =>
        set(state => {
            let nextRegistry = state.widgetRegistry
            let nextMsg = { ...msg } as Message

            if (msg.reportData) {
                const widgetId = crypto.randomUUID()
                nextRegistry = {
                    ...nextRegistry,
                    [widgetId]: msg.reportData
                }
                nextMsg.widgetId = widgetId
                delete (nextMsg as any).reportData
            }

            return {
                widgetRegistry: nextRegistry,
                sessions: state.sessions.map(s =>
                    s.id === state.activeSessionId
                    ? {
                        ...s,
                        messages: [...s.messages, nextMsg],
                        lastModified: Date.now(),
                        }
                    : s
                ),
            }
        }),

      updateMessage: (id, update) =>
        set(state => {
            const session = state.sessions.find(s => s.id === state.activeSessionId)
            if (!session) return state

            const existingMsg = session.messages.find(m => m.id === id)
            if (!existingMsg) return state

            let nextRegistry = { ...state.widgetRegistry }
            let nextUpdate = { ...update } as Partial<Message>

            if (update.reportData) {
                const wId = existingMsg.widgetId || crypto.randomUUID()
                const existingData = nextRegistry[wId] || ({} as ReportData)
                nextRegistry[wId] = { ...existingData, ...update.reportData } as ReportData
                
                nextUpdate.widgetId = wId
                delete (nextUpdate as any).reportData
            }

            return {
                widgetRegistry: nextRegistry,
                sessions: state.sessions.map(s => s.id === state.activeSessionId ? {
                    ...s,
                    messages: s.messages.map(m => m.id === id ? { ...m, ...nextUpdate } : m),
                    lastModified: Date.now()
                } : s)
            }
        }),

      deleteMessage: (id) =>
        set(state => {
            const session = state.sessions.find(s => s.id === state.activeSessionId)
            if (!session) return state

            const message = session.messages.find(m => m.id === id)
            if (!message) return state

            let nextRegistry = state.widgetRegistry
            let nextDashboard = session.dashboard

            if (message.widgetId) {
                // Remove from registry
                const { [message.widgetId]: _, ...remainingRegistry } = nextRegistry
                nextRegistry = remainingRegistry

                // Remove from dashboard widgets
                nextDashboard = {
                    ...nextDashboard,
                    widgets: nextDashboard.widgets.filter(w => w.widgetId !== message.widgetId)
                }
            }

            return {
                widgetRegistry: nextRegistry,
                sessions: state.sessions.map(s => s.id === state.activeSessionId ? {
                    ...s,
                    dashboard: nextDashboard,
                    messages: s.messages.filter(m => m.id !== id),
                    lastModified: Date.now()
                } : s)
            }
        }),

      setReplyTo: (replyToId: string | null) =>
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === state.activeSessionId
              ? { ...s, replyToId: replyToId ?? undefined }
              : s
          ),
        })),

      setAbortController: (controller: AbortController | null) =>
        set(state => {
          if (!state.activeSessionId) return state
          
          const newControllers = { ...state.abortControllers }
          if (controller) {
            newControllers[state.activeSessionId] = controller
          } else {
            delete newControllers[state.activeSessionId]
          }
          return { abortControllers: newControllers }
        }),

      addWidget: (widget) =>
        set(state => {
             let nextRegistry = state.widgetRegistry
             let nextWidget = { ...widget } as ReportWidget
             
             if (widget.reportData) {
                 // Use provided widgetId or generate new one
                 const wId = widget.widgetId || crypto.randomUUID()
                 
                 // If reusing widgetId, we overwrite registry data? 
                 // Yes, assuming the latest data is passed. 
                 // Or we could check if it exists.
                 // For strong consistency, updating registry with latest reportData is correct.
                 nextRegistry = { ...nextRegistry, [wId]: widget.reportData }
                 
                 nextWidget.widgetId = wId
                 delete (nextWidget as any).reportData
             }
             
             return {
                 widgetRegistry: nextRegistry,
                 sessions: state.sessions.map(s =>
                    s.id === state.activeSessionId
                    ? {
                        ...s,
                        dashboard: {
                            ...s.dashboard,
                            widgets: [...s.dashboard.widgets, nextWidget],
                        },
                        lastModified: Date.now(),
                        }
                    : s
                ),
             }
        }),

      removeWidget: (id: string) =>
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === state.activeSessionId
              ? {
                  ...s,
                  dashboard: {
                    ...s.dashboard,
                    widgets: s.dashboard.widgets.filter(w => w.id !== id),
                  },
                  lastModified: Date.now(),
                }
              : s
          ),
        })),

      updateWidget: (id: string, update: Partial<ReportWidget> | ((w: ReportWidget) => ReportWidget)) =>
        set(state => ({
            sessions: state.sessions.map(s =>
                s.id === state.activeSessionId
                ? {
                    ...s,
                    dashboard: {
                        ...s.dashboard,
                        widgets: s.dashboard.widgets.map(w => {
                            if (w.id !== id) return w
                            if (typeof update === 'function') {
                                return update(w)
                            }
                            return { ...w, ...update }
                        })
                    },
                    lastModified: Date.now()
                }
                : s
            )
        })),

      updateWidgetData: (id, update) =>
        set(state => {
            const session = state.sessions.find(s => s.id === state.activeSessionId)
            if (!session) return state
            const widget = session.dashboard.widgets.find(w => w.id === id)
            if (!widget) return state

            const wId = widget.widgetId
            const currentData = state.widgetRegistry[wId] || ({} as ReportData)
            
            return {
                widgetRegistry: {
                    ...state.widgetRegistry,
                    [wId]: { ...currentData, ...update } as ReportData
                },
                sessions: state.sessions.map(s => s.id === state.activeSessionId ? { ...s, lastModified: Date.now() } : s)
            }
        }),

      updateLayout: (layout: any) =>
        set(state => {
            if (Array.isArray(layout)) {
                const layoutMap = new Map(layout.map((l: any) => [l.i, l]))
                 return {
                    sessions: state.sessions.map(s =>
                        s.id === state.activeSessionId
                        ? {
                            ...s,
                            dashboard: {
                                ...s.dashboard,
                                widgets: s.dashboard.widgets.map(w => {
                                    const newL = layoutMap.get(w.id)
                                    return newL ? { ...w, layout: { ...w.layout, ...newL } } : w
                                })
                            },
                            lastModified: Date.now()
                        }
                        : s
                    )
                }
            }
            return state; 
        }),

      updateReportTitle: (id: string, title: string) =>
        set(state => {
            // Need to update Registry
            const session = state.sessions.find(s => s.id === state.activeSessionId)
            if (!session) return state
            const widget = session.dashboard.widgets.find(w => w.id === id)
            if (!widget || !widget.widgetId) return state

            const oldData = state.widgetRegistry[widget.widgetId] || {}
            
            return {
                widgetRegistry: {
                    ...state.widgetRegistry,
                    [widget.widgetId]: { ...oldData, title }
                },
                sessions: state.sessions.map(s => s.id === state.activeSessionId ? { ...s, lastModified: Date.now() } : s)
            }
        }),

      setCanvasConfig: (config: any) =>
        set(state => ({
            sessions: state.sessions.map(s =>
                s.id === state.activeSessionId
                ? {
                    ...s,
                    dashboard: {
                        ...s.dashboard,
                        ...config
                    },
                    title: config.title ?? s.title, // Sync title
                    lastModified: Date.now()
                }
                : s
            )
        })),

      setLayoutScenario: (scenario: LayoutScenario) => set({ layoutScenario: scenario }),
      setEditingReportId: (id: string | null) => set({ editingReportId: id }),
      setLanguage: (lang: Language) => set({ language: lang }),

      addFile: (file: FileNode) =>
        set(state => ({
          files: [...state.files, file],
        })),

      removeFile: (id: string) =>
        set(state => ({
          files: state.files.filter(f => f.id !== id),
        })),

      replaceFile: async (fileId: string, newPath: string, force: boolean = false) => {
        let file = get().files.find(f => f.id === fileId)
        let sourceStore: 'project' | 'file' = 'project'

        // Fallback to useFileStore if not found in project store
        if (!file) {
            const legacyFiles = useFileStore.getState().files
            file = legacyFiles.find(f => f.id === fileId)
            if (file) {
                sourceStore = 'file'
            }
        }

        if (!file) {
            console.error(`replaceFile: File ${fileId} not found in project or file store`)
            return 'error'
        }

        try {
            // Optimistic update status
            if (sourceStore === 'project') {
                set(state => ({
                    files: state.files.map(f => f.id === fileId ? { ...f, status: 'processing' } : f)
                }))
            } else {
                 useFileStore.getState().updateFile(fileId, { status: 'processing' })
            }

            if (!force) {
                // 1. Peek New Schema (Validation)
                const parseRes = await window.electronAPI.parseFile(newPath)
                if (!parseRes.success || !parseRes.data || parseRes.data.length === 0) {
                     throw new Error(parseRes.error || 'Failed to parse new file for validation')
                }

                // Find best matching sheet/table from the parsed result
                let candidate = parseRes.data[0]
                if (file.sheetName) {
                    // Try to find the same sheet name
                    const match = parseRes.data.find((d: any) => d.sheetName === file.sheetName)
                    if (match) candidate = match
                }

                const newColNames = new Set(candidate.schema.columns.map((c: any) => c.name))
                const oldColNames = file.columns.map(c => c.name)
                const missing = oldColNames.filter(c => !newColNames.has(c))

                // Clean up temporary tables created by parseFile
                for (const item of parseRes.data) {
                    await window.electronAPI.deleteTable(item.tableName)
                }

                // User Confirmation if Schema Mismatch
                if (missing.length > 0) {
                    set({
                        pendingReplace: {
                            fileId,
                            newPath,
                            missing
                        }
                    })
                    // Revert status to ready
                    if (sourceStore === 'project') {
                        set(state => ({
                            files: state.files.map(f => f.id === fileId ? { ...f, status: 'ready' } : f)
                        }))
                    } else {
                        useFileStore.getState().updateFile(fileId, { status: 'ready' })
                    }
                    return 'pending'
                }
            }

            // 2. Trigger Backend Re-ingest
            const result = await window.electronAPI.reIngestFile(newPath, file.tableName, file.sheetName)
            
            if (!result.success || !result.data) {
                 throw new Error(result.error || 'Re-ingest failed')
            }

            const { lastModified, newColumns } = result.data

            // 3. Fetch new row count
            let rowCount = 0
            try {
                const countRes = await window.electronAPI.runSQL(`SELECT COUNT(*) as c FROM "${file.tableName}"`)
                if (countRes.success && countRes.data && countRes.data.length > 0) {
                    const c = countRes.data[0].c
                    rowCount = typeof c === 'bigint' ? Number(c) : Number(c)
                }
            } catch (e) {
                console.warn('Failed to fetch row count after replace', e)
            }

            // 4. Update Store
            if (sourceStore === 'project') {
                set(state => ({
                    files: state.files.map(f => f.id === fileId ? { 
                        ...f, 
                        path: newPath, 
                        lastModified: lastModified || Date.now(),
                        columns: newColumns,
                        rowCount: rowCount,
                        status: 'ready',
                        error: undefined
                    } : f)
                }))
            } else {
                // Update legacy store
                useFileStore.getState().reloadFile(fileId, { lastModified, newColumns })
                useFileStore.getState().updateFile(fileId, { 
                    path: newPath, 
                    rowCount, 
                    status: 'ready', 
                    error: undefined 
                })
            }
            return 'completed'

        } catch (error: any) {
            console.error('replaceFile failed', error)
            const errorMessage = error.message || 'Failed to replace file'
            
            if (sourceStore === 'project') {
                set(state => ({
                    files: state.files.map(f => f.id === fileId ? { 
                        ...f, 
                        status: 'error',
                        error: errorMessage
                    } : f)
                }))
            } else {
                useFileStore.getState().updateFile(fileId, { 
                    status: 'error', 
                    error: errorMessage 
                })
            }
            return 'error'
        }
      },

      loadProject: (data: ProjectData) => set({ ...data }),

      serialize: () => {
        // Destructure actions to exclude them from serialization
        const { 
            createSession, switchSession, deleteSession, renameSession, 
            addMessage, updateMessage, setReplyTo, setAbortController,
            addWidget, removeWidget, updateLayout, updateReportTitle, setCanvasConfig,
            setLayoutScenario, setEditingReportId, setLanguage,
            addFile, removeFile, loadProject, serialize, reset,
            abortControllers, layoutScenario, editingReportId, language, pendingReplace, confirmReplace, setPendingReplace, refreshSessionWidgets,
            showRefreshConfirm, setShowRefreshConfirm, // Exclude transient & actions
            ...data 
        } = get()
        
        return JSON.stringify(data, (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString()
            }
            return value
        })
      },

      reset: () => set(initialProjectState),
    }),
    {
      name: 'wansan-project-v2',
      storage: createBigIntStorage(),
      partialize: (state) => {
        const { abortControllers, layoutScenario, editingReportId, pendingReplace, showRefreshConfirm, ...rest } = state
        return rest
      }
    }
  )
)