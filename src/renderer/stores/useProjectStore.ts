import { create } from 'zustand'
import { ProjectData, Session } from '@shared/types/project'
import { Message } from '@shared/types/chat'
import { ReportWidget } from '@shared/types/dashboard'
import { FileNode } from '@shared/types'
import { Layout } from 'react-grid-layout'

export type LayoutScenario = 'default' | 'print' | 'large' | 'ppt' | 'email'
export type Language = 'en' | 'zh'

interface ProjectState extends ProjectData {
  // Transient State
  abortControllers: Record<string, AbortController>
  layoutScenario: LayoutScenario
  editingReportId: string | null
  language: Language

  // --- Actions ---

  // 1. Session Management
  createSession: () => void
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void

  // 2. Chat Actions (Targeting Active Session)
  addMessage: (msg: Message) => void
  updateMessage: (id: string, update: Partial<Message>) => void
  setReplyTo: (replyToId: string | null) => void
  setAbortController: (controller: AbortController | null) => void

  // 3. Dashboard Actions (Targeting Active Session)
  addWidget: (widget: ReportWidget) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, update: Partial<ReportWidget> | ((w: ReportWidget) => ReportWidget)) => void
  updateLayout: (layout: any) => void // Placeholder signature, updated below
  updateReportTitle: (id: string, title: string) => void
  setCanvasConfig: (config: any) => void // Placeholder
  
  // 4. UI Actions
  setLayoutScenario: (scenario: LayoutScenario) => void
  setEditingReportId: (id: string | null) => void
  setLanguage: (lang: Language) => void

  // 5. File Actions (Global)
  addFile: (file: FileNode) => void
  removeFile: (id: string) => void
  replaceFile: (fileId: string, newPath: string) => Promise<void>

  // 6. IO
  loadProject: (data: ProjectData) => void
  serialize: () => string
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
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialProjectState,
  abortControllers: {},
  layoutScenario: 'default',
  editingReportId: null,
  language: 'en', // Default, should detect

  createSession: () =>
    set(state => {
      const newSession = createNewSession()
      return {
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
      // If we deleted the active session, switch to another one or create new
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

  addMessage: (msg: Message) =>
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === state.activeSessionId
          ? {
              ...s,
              messages: [...s.messages, msg],
              lastModified: Date.now(),
            }
          : s
      ),
    })),

  updateMessage: (id: string, update: Partial<Message>) =>
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === state.activeSessionId
          ? {
              ...s,
              messages: s.messages.map(m =>
                m.id === id ? { ...m, ...update } : m
              ),
              lastModified: Date.now(),
            }
          : s
      ),
    })),

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

  addWidget: (widget: ReportWidget) =>
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === state.activeSessionId
          ? {
              ...s,
              dashboard: {
                ...s.dashboard,
                widgets: [...s.dashboard.widgets, widget],
              },
              lastModified: Date.now(),
            }
          : s
      ),
    })),

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

  updateLayout: (layout: any) =>
    set(state => {
        // Simple implementation assuming layout is array of updates or new widgets
        // But for bridge compatibility we might need more specific logic.
        // For now, assuming standard update.
        // If layout is array of {i, x, y, w, h}
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
    set(state => ({
        sessions: state.sessions.map(s =>
            s.id === state.activeSessionId
            ? {
                ...s,
                dashboard: {
                    ...s.dashboard,
                    widgets: s.dashboard.widgets.map(w => w.id === id ? { ...w, reportData: { ...w.reportData, title } } : w)
                },
                lastModified: Date.now()
            }
            : s
        )
    })),

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

  replaceFile: async (fileId: string, newPath: string) => {
    const file = get().files.find(f => f.id === fileId)
    if (!file) return

    try {
        set(state => ({
            files: state.files.map(f => f.id === fileId ? { ...f, status: 'processing' } : f)
        }))

        // 1. Trigger Backend Re-ingest
        // We assume reIngestFile exists on electronAPI
        const result = await window.electronAPI.reIngestFile(newPath, file.tableName, file.sheetName)
        
        if (!result.success || !result.data) {
             throw new Error(result.error || 'Re-ingest failed')
        }

        const { lastModified, newColumns } = result.data

        // 2. Fetch new row count
        // We use runSQL to count rows
        let rowCount = 0
        try {
            const countRes = await window.electronAPI.runSQL(`SELECT COUNT(*) as c FROM "${file.tableName}"`)
            if (countRes.success && countRes.data && countRes.data.length > 0) {
                // DuckDB returns BigInt for count usually, verify
                const c = countRes.data[0].c
                rowCount = typeof c === 'bigint' ? Number(c) : Number(c)
            }
        } catch (e) {
            console.warn('Failed to fetch row count after replace', e)
        }

        // 3. Update Store
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

    } catch (error: any) {
        console.error('replaceFile failed', error)
        set(state => ({
            files: state.files.map(f => f.id === fileId ? { 
                ...f, 
                status: 'error',
                error: error.message || 'Failed to replace file'
            } : f)
        }))
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
        addFile, removeFile, loadProject, serialize, 
        abortControllers, layoutScenario, editingReportId, language, // Exclude transient
        ...data 
    } = get()
    
    return JSON.stringify(data, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString()
        }
        return value
    })
  },
}))