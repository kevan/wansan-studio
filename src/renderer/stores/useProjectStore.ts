import { create } from 'zustand'
import { ProjectData, Session } from '@shared/types/project'
import { Message } from '@shared/types/chat'
import { ReportWidget } from '@shared/types/dashboard'
import { FileNode } from '@shared/types'

interface ProjectState extends ProjectData {
  // --- Actions ---

  // 1. Session Management
  createSession: () => void
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void

  // 2. Chat Actions (Targeting Active Session)
  addMessage: (msg: Message) => void
  updateMessage: (id: string, update: Partial<Message>) => void

  // 3. Dashboard Actions (Targeting Active Session)
  addWidget: (widget: ReportWidget) => void
  removeWidget: (id: string) => void
  updateLayout: (layout: any) => void

  // 4. File Actions (Global)
  addFile: (file: FileNode) => void
  removeFile: (id: string) => void

  // 5. IO
  loadProject: (data: ProjectData) => void
  serialize: () => string
}

const createNewSession = (): Session => ({
  id: crypto.randomUUID(),
  title: 'New Session',
  createdAt: Date.now(),
  lastModified: Date.now(),
  messages: [],
  dashboard: {
    widgets: [],
    layoutMode: 'a4',
    pageCount: 1,
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
      
      return {
        sessions: newSessions,
        activeSessionId: newActiveId,
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

  updateLayout: (layout: any) =>
    set(state => {
        // Placeholder for layout updates.
        return state; 
    }),

  addFile: (file: FileNode) =>
    set(state => ({
      files: [...state.files, file],
    })),

  removeFile: (id: string) =>
    set(state => ({
      files: state.files.filter(f => f.id !== id),
    })),

  loadProject: (data: ProjectData) => set({ ...data }),

  serialize: () => {
    // Destructure actions to exclude them from serialization
    const { 
        createSession, switchSession, deleteSession, renameSession, 
        addMessage, updateMessage, addWidget, removeWidget, 
        updateLayout, addFile, removeFile, loadProject, serialize, 
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