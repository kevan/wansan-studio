import { create } from 'zustand'
import type { ColumnSchema, FileNode, SyncStatus } from '../../shared/types'

// Re-export shared types for other components to use
export type { ColumnSchema, FileNode, SyncStatus }
export type FileAsset = FileNode // Backward compatibility alias

// 表关联类型
export interface Relation {
  id: string
  fileAId: string
  columnA: string
  fileBId: string
  columnB: string
  autoDetected?: boolean // 是否自动检测
}

// 选中节点类型
export type SelectedNodeType = 'file' | 'column' | 'relation' | null

export type ViewMode = 'chat' | 'schema' | 'relationships'

// 选中节点信息
export interface SelectedNode {
  id: string
  type: SelectedNodeType
  fileId?: string // 如果是 column，关联的文件 ID
  columnName?: string // 如果是 column，列名
  relationId?: string // 如果是 relation，关联 ID
}

// 项目状态
export interface ProjectState {
  // 项目信息
  projectName: string

  // 文件资产
  files: FileNode[]

  // 表关联关系
  relations: Relation[]

  // AI 建议的提示词
  suggestedPrompts: string[]

  // 当前选中的文件 ID (保留向后兼容)
  activeFileId: string | null

  // 当前活动视图
  activeView: ViewMode

  // 当前选中的树节点 (支持文件、列、关联)
  selectedNode: SelectedNode | null

  // Actions
  setProjectName: (name: string) => void
  addFile: (
    file: Omit<FileNode, 'id' | 'createdAt' | 'lastModified'> & {
      status?: SyncStatus
    }
  ) => string
  updateFile: (id: string, updates: Partial<FileNode>) => void
  removeFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  setView: (mode: ViewMode, fileId?: string | null) => void

  // 树节点选择
  setSelectedNode: (node: SelectedNode | null) => void

  // 列操作
  updateColumn: (
    fileId: string,
    columnName: string,
    updates: Partial<ColumnSchema>
  ) => void
  toggleKeyColumn: (fileId: string, columnName: string) => void

  // 关联操作
  addRelation: (relation: Omit<Relation, 'id'>) => void
  removeRelation: (id: string) => void

  setSuggestedPrompts: (prompts: string[]) => void

  // Sync Actions
  markAsStale: (ids: string[]) => void
  reloadFile: (
    fileId: string,
    result: { lastModified: number; newColumns: ColumnSchema[] }
  ) => number // Returns dropped relations count

  // 重置
  reset: () => void
}

// 生成唯一 ID
const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// 初始状态
const initialState = {
  projectName: '未命名项目',
  files: [],
  relations: [],
  suggestedPrompts: [],
  activeFileId: null,
  activeView: 'chat' as ViewMode,
  selectedNode: null,
}

export const useFileStore = create<ProjectState>((set, get) => ({
  ...initialState,

  setProjectName: name => set({ projectName: name }),

  addFile: file => {
    const id = generateId()
    const now = Date.now()
    const newFile: FileNode = {
      ...file,
      id,
      createdAt: now,
      lastModified: now, // Initial assumption, will be corrected by watcher if needed
      status: file.status || 'ready', // Default to ready if not provided (e.g. direct load), or use provided (e.g. uploading)
    }
    set(state => ({
      files: [...state.files, newFile],
      activeFileId: id,
      activeView: 'schema',
    }))

    return id
  },

  updateFile: (id, updates) => {
    set(state => ({
      files: state.files.map(f => (f.id === id ? { ...f, ...updates } : f)),
    }))
  },

  removeFile: id => {
    set(state => {
      const remainingFiles = state.files.filter(f => f.id !== id)
      const remainingRelations = state.relations.filter(
        r => r.fileAId !== id && r.fileBId !== id
      )
      const activeFileId = state.activeFileId === id ? remainingFiles[0]?.id ?? null : state.activeFileId
      const activeView =
        state.activeView === 'schema' && !activeFileId ? 'chat' : state.activeView

      return {
        files: remainingFiles,
        relations: remainingRelations,
        activeFileId,
        activeView,
      }
    })
  },

  setActiveFile: id => set({ activeFileId: id }),
  setView: (mode, fileId) =>
    set(state => ({
      activeView: mode,
      activeFileId:
        mode === 'schema'
          ? fileId ?? state.activeFileId ?? state.files[0]?.id ?? null
          : fileId ?? state.activeFileId,
    })),

  setSelectedNode: node => set({ selectedNode: node }),

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

  setSuggestedPrompts: prompts => set({ suggestedPrompts: prompts }),

  markAsStale: ids =>
    set(state => ({
      files: state.files.map(f =>
        ids.includes(f.id) ? { ...f, status: 'out-of-sync' } : f
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
            // If the user changed the type in UI, it's stored in 'type' currently.
            // We should preserve 'type' as well if we consider it user-defined.
            // But if the underlying type changed (e.g. string -> int), keeping 'type' might be wrong.
            // However, 'userType' is the new explicit override.
            // Existing logic uses 'type'. Let's preserve 'type' if it matches 'userType' or just preserve it?
            // "Preserve user configurations (semantic types)"
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
            ? { ...f, columns: mergedColumns, status: 'ready', lastModified }
            : f
        ),
        relations: activeRelations,
      }
    })
    return droppedRelationsCount
  },

  reset: () => set(initialState),
}))
