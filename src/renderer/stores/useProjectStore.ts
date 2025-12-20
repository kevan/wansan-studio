import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ProjectData, Session, ViewMode, Relation } from '@shared/types/project'
import { Message } from '@shared/types/chat'
import { ReportWidget, ReportData } from '@shared/types/dashboard'
import { FileNode, ColumnSchema, SelectedNode, SyncStatus } from '@shared/types'
import { Layout } from 'react-grid-layout'
import { createBigIntStorage } from '@shared/serialization'
import { Analytics } from '../services/analytics'
import { useSettingsStore } from './useSettingsStore'
import { useToastStore } from './useToastStore'
import i18n from '../i18n'

// 生成唯一 ID
const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export type LayoutScenario = 'default' | 'print' | 'large' | 'ppt' | 'email'
export type Language = 'en' | 'zh'

export interface SqlLabSession {
  mode: 'widget' | 'file'
  targetId: string // widgetId or tableName
  initialSql: string
  onSave?: (sql: string) => Promise<void>
}

export interface ProjectState extends ProjectData {
  // Transient State
  abortControllers: Record<string, AbortController>
  layoutScenario: LayoutScenario
  editingReportId: string | null
  pendingReplace: { fileId: string; newPath: string; missing: string[] } | null
  showRefreshConfirm: boolean
  sidebarMode: 'sessions' | 'data'
  suggestedPrompts: string[]
  selectedNode: SelectedNode | null
  isRestoring: boolean
  sqlLabSession: SqlLabSession | null

  // --- Actions ---

  // 1. Session Management
  createSession: () => void
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  setSidebarMode: (mode: 'sessions' | 'data') => void
  setView: (view: ViewMode) => void
  setActiveFile: (id: string | null) => void
  setProjectName: (name: string) => void
  openSqlLab: (session: SqlLabSession) => void
  closeSqlLab: () => void

  // 2. Chat Actions (Targeting Active Session)
  // Accepts denormalized message (with reportData) and normalizes it
  addMessage: (msg: Message & { reportData?: ReportData }) => void
  updateMessage: (id: string, update: Partial<Message> & { reportData?: Partial<ReportData> }) => void
  deleteMessage: (id: string) => void
  clearSessionMessages: (sessionId: string) => void
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
  setPendingReplace: (payload: { fileId: string; newPath: string; missing: string[] } | null) => void
  setShowRefreshConfirm: (open: boolean) => void
  confirmReplace: () => Promise<void>
  refreshSessionWidgets: () => Promise<void>
  setSelectedNode: (node: SelectedNode | null) => void
  setRestoring: (isRestoring: boolean) => void

  // 5. File Actions (Global)
  addFile: (file: Omit<FileNode, 'id' | 'createdAt' | 'lastModified'> & { status?: SyncStatus }) => string
  updateFile: (id: string, updates: Partial<FileNode>) => void
  removeFile: (id: string) => void
  replaceFile: (fileId: string, newPath: string, force?: boolean) => Promise<'completed' | 'pending' | 'error'>
  updateColumn: (fileId: string, columnName: string, updates: Partial<ColumnSchema>) => void
  toggleKeyColumn: (fileId: string, columnName: string) => void
  addRelation: (relation: Omit<Relation, 'id'>) => void
  removeRelation: (id: string) => void
  setSuggestedPrompts: (prompts: string[]) => void
  markAsStale: (ids: string[]) => void
  markFileMissing: (id: string) => void
  reloadFile: (fileId: string, result: { lastModified: number; newColumns: ColumnSchema[] }) => number

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
  activeView: 'chat',
  activeFileId: null,
  widgetRegistry: {},
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...initialProjectState,
      abortControllers: {},
      layoutScenario: 'default',
      editingReportId: null,
      pendingReplace: null,
      showRefreshConfirm: false,
      sidebarMode: 'sessions',
      suggestedPrompts: [],
      selectedNode: null,
      isRestoring: false,
      sqlLabSession: null,

      setSidebarMode: (mode) => set({ sidebarMode: mode }),
      setView: (view) => set(state => {
          let newSidebarMode = state.sidebarMode
          if (view === 'schema' || view === 'relationships') {
              newSidebarMode = 'data'
          } else if (view === 'chat') {
              newSidebarMode = 'sessions'
          }
          return { activeView: view, sidebarMode: newSidebarMode }
      }),
      setActiveFile: (id) => set({ activeFileId: id }),
      setPendingReplace: (payload) => set({ pendingReplace: payload }),
      setShowRefreshConfirm: (open) => set({ showRefreshConfirm: open }),
      openSqlLab: (session) => set({ sqlLabSession: session }),
      closeSqlLab: () => set({ sqlLabSession: null }),

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

      clearSessionMessages: (sessionId) =>
        set(state => {
            const session = state.sessions.find(s => s.id === sessionId)
            if (!session) return state

            const widgetIdsToRemove = new Set(session.messages.map(m => m.widgetId).filter(Boolean))
            
            const newRegistry = { ...state.widgetRegistry }
            widgetIdsToRemove.forEach(id => {
                if (id) delete newRegistry[id]
            })

            return {
                widgetRegistry: newRegistry,
                sessions: state.sessions.map(s => 
                    s.id === sessionId ? { ...s, messages: [], lastModified: Date.now() } : s
                )
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
      
      setProjectName: (name) => set(state => ({ meta: { ...state.meta, name } })),
      setSelectedNode: (node) => set({ selectedNode: node }),
      setRestoring: (val) => set({ isRestoring: val }),
      setSuggestedPrompts: (prompts) => set({ suggestedPrompts: prompts }),

      addFile: (file) => {
        // [LIMIT CHECK]
        const { isActivated } = useSettingsStore.getState()
        const currentCount = get().files.length

        if (!isActivated && currentCount >= 1) {
          throw new Error('Trial version supports only 1 file. Please activate Pro for unlimited files.')
        }

        const existing = get().files.find(
          f => f.path === file.path && f.sheetName === file.sheetName
        )
        if (existing) {
          throw new Error(`File "${file.name}" is already imported.`)
        }

        const id = generateId()
        const now = Date.now()
        const newFile: FileNode = {
          ...file,
          id,
          createdAt: now,
          lastModified: now,
          status: file.status || 'ready',
        }
        set(state => ({
          files: [...state.files, newFile],
        }))
        
        const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown'
        Analytics.track('file_imported', { file_type: ext })
        return id
      },

      removeFile: async (id) => {
        const { files } = get()
        const file = files.find(f => f.id === id)

        if (file) {
          try {
            await window.electronAPI.deleteTable(file.tableName)
          } catch (e) {
            console.error('Failed to drop table', e)
          }
        }
        
        set(state => ({
          files: state.files.filter(f => f.id !== id),
          relations: state.relations.filter(r => r.fileAId !== id && r.fileBId !== id)
        }))
      },
      
      updateFile: (id, updates) =>
        set(state => ({
          files: state.files.map(f => (f.id === id ? { ...f, ...updates } : f)),
        })),

      updateColumn: (fileId, columnName, updates) => {
        set(state => ({
          files: state.files.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  columns: f.columns.map(c =>
                    c.name === columnName ? { ...c, ...updates } : c
                  ),
                }
              : f
          ),
        }))
      },

      toggleKeyColumn: (fileId, columnName) => {
        const file = get().files.find(f => f.id === fileId)
        if (!file) return

        const column = file.columns.find(c => c.name === columnName)
        if (!column) return

        get().updateColumn(fileId, columnName, { isKey: !column.isKey })
      },

      addRelation: relation => {
        const exists = get().relations.some(
          r =>
            (r.fileAId === relation.fileAId &&
              r.columnA === relation.columnA &&
              r.fileBId === relation.fileBId &&
              r.columnB === relation.columnB) ||
            (r.fileAId === relation.fileBId &&
              r.columnA === relation.columnB &&
              r.fileBId === relation.fileAId &&
              r.columnB === relation.columnA)
        )
        if (exists) {
          console.warn('Relationship already exists.')
          return
        }
        const id = generateId()
        set(state => ({
          relations: [...state.relations, { ...relation, id }],
        }))
      },

      removeRelation: id => {
        set(state => ({
          relations: state.relations.filter(r => r.id !== id),
        }))
      },

      markAsStale: ids =>
        set(state => ({
          files: state.files.map(f =>
            ids.includes(f.id) ? { ...f, status: 'out-of-sync' } : f
          ),
        })),

      markFileMissing: id =>
        set(state => ({
          files: state.files.map(f =>
            f.id === id ? { ...f, status: 'missing' } : f
          ),
        })),

      reloadFile: (fileId, { lastModified, newColumns }) => {
        let droppedRelationsCount = 0
        set(state => {
          const file = state.files.find(f => f.id === fileId)
          if (!file) return state

          const oldColumns = file.columns
          const mergedColumns = newColumns.map(newCol => {
            const oldCol = oldColumns.find(c => c.name === newCol.name)
            if (oldCol) {
              return {
                ...newCol,
                userType: oldCol.userType,
                alias: oldCol.alias,
                isKey: oldCol.isKey,
                type: oldCol.type,
              }
            } else {
              return newCol
            }
          })

          const activeRelations = state.relations.filter(r => {
            let valid = true
            if (r.fileAId === fileId) {
              if (!mergedColumns.some(c => c.name === r.columnA)) valid = false
            }
            if (r.fileBId === fileId) {
              if (!mergedColumns.some(c => c.name === r.columnB)) valid = false
            }
            return valid
          })
          droppedRelationsCount = state.relations.length - activeRelations.length
          return {
            files: state.files.map(f =>
              f.id === fileId
                ? {
                    ...f,
                    columns: mergedColumns,
                    status: 'ready',
                    lastModified,
                  }
                : f
            ),
            relations: activeRelations,
          }
        })
        return droppedRelationsCount
      },

            replaceFile: async (fileId: string, newPath: string, force: boolean = false) => {

              let file = get().files.find(f => f.id === fileId)

              

              if (!file) {

                  console.error(`replaceFile: File ${fileId} not found in project store`)

                  return 'error'

              }

      

              try {

                  // Optimistic update status

                  set(state => ({

                      files: state.files.map(f => f.id === fileId ? { ...f, status: 'processing' } : f)

                  }))

      

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

                          set(state => ({

                              files: state.files.map(f => f.id === fileId ? { ...f, status: 'ready' } : f)

                          }))

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

                      const countRes = await window.electronAPI.runSQL(`SELECT COUNT(*) as c FROM "${file.tableName}" `)

                      if (countRes.success && countRes.data && countRes.data.length > 0) {

                          const c = countRes.data[0].c

                          rowCount = typeof c === 'bigint' ? Number(c) : Number(c)

                      }

                  } catch (e) {

                      console.warn('Failed to fetch row count after replace', e)

                  }

      

                  // 4. Update Store (Merge Logic from reloadFile)

                  get().reloadFile(fileId, { lastModified, newColumns })

      

                  set(state => ({

                      files: state.files.map(f => f.id === fileId ? { 

                          ...f, 

                          path: newPath, 

                          rowCount: rowCount,

                          status: 'ready',

                          error: undefined

                      } : f)

                  }))

                  

                  return 'completed'

      

              } catch (error: any) {

                  console.error('replaceFile failed', error)

                  const errorMessage = error.message || 'Failed to replace file'

                  

                  set(state => ({

                      files: state.files.map(f => f.id === fileId ? { 

                          ...f, 

                          status: 'error',

                          error: errorMessage

                      } : f)

                  }))

                  return 'error'

              }

            },

      

      loadProject: (data: ProjectData) => set({ ...data }),

      serialize: () => {
        // Destructure actions to exclude them from serialization
        const { 
            createSession, switchSession, deleteSession, renameSession, 
            addMessage, updateMessage, setReplyTo, setAbortController, deleteMessage, clearSessionMessages,
            addWidget, removeWidget, updateLayout, updateReportTitle, setCanvasConfig,
            setLayoutScenario, setEditingReportId,
            addFile, removeFile, loadProject, serialize, reset,
            abortControllers, layoutScenario, editingReportId, pendingReplace, confirmReplace, setPendingReplace, refreshSessionWidgets,
            showRefreshConfirm, setShowRefreshConfirm, // Exclude transient & actions
            sqlLabSession, openSqlLab, closeSqlLab,
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