import { create } from 'zustand'
import type { ColumnSchema, FileNode, SyncStatus } from '../../shared/types'

// Re-export shared types for other components to use
export type { ColumnSchema, FileNode, SyncStatus }
export type FileAsset = FileNode; // Backward compatibility alias

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

  // 当前选中的文件 ID (保留向后兼容)
  activeFileId: string | null

  // 当前选中的树节点 (支持文件、列、关联)
  selectedNode: SelectedNode | null

  // 是否显示 Schema 确认页
  showSchemaConfirm: boolean

  // Actions
  setProjectName: (name: string) => void
  addFile: (file: Omit<FileNode, 'id' | 'createdAt' | 'lastModified'> & { status?: SyncStatus }) => string
  updateFile: (id: string, updates: Partial<FileNode>) => void
  removeFile: (id: string) => void
  setActiveFile: (id: string | null) => void

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
  detectRelations: () => void

  // Schema 确认
  setShowSchemaConfirm: (show: boolean) => void
  confirmSchema: () => void

  // Sync Actions
  markAsStale: (ids: string[]) => void
  reloadFile: (fileId: string, result: { lastModified: number, newColumns: ColumnSchema[] }) => number // Returns dropped relations count

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
  activeFileId: null,
  selectedNode: null,
  showSchemaConfirm: false,
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
      showSchemaConfirm: true,
    }))

    // 尝试自动检测关联
    setTimeout(() => get().detectRelations(), 100)

    return id
  },

  updateFile: (id, updates) => {
    set(state => ({
      files: state.files.map(f => (f.id === id ? { ...f, ...updates } : f)),
    }))
  },

  removeFile: id => {
    set(state => ({
      files: state.files.filter(f => f.id !== id),
      relations: state.relations.filter(
        r => r.fileAId !== id && r.fileBId !== id
      ),
      activeFileId: state.activeFileId === id ? null : state.activeFileId,
    }))
  },

  setActiveFile: id => set({ activeFileId: id }),

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

  // 自动检测可能的关联关系
  detectRelations: () => {
    const { files, relations } = get()
    if (files.length < 2) return

    const newRelations: Omit<Relation, 'id'>[] = []

    // 遍历所有文件对
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const fileA = files[i]
        const fileB = files[j]

        // 查找可能匹配的列名
        for (const colA of fileA.columns) {
          for (const colB of fileB.columns) {
            // 简单匹配规则：列名相同或包含 id/ID
            const nameA = colA.name.toLowerCase()
            const nameB = colB.name.toLowerCase()

            const isMatch =
              nameA === nameB ||
              (nameA.includes('id') &&
                nameB.includes('id') &&
                nameA.replace('_id', '').replace('id', '') ===
                  nameB.replace('_id', '').replace('id', ''))

            if (isMatch) {
              // 检查是否已存在此关联
              const exists = relations.some(
                r =>
                  (r.fileAId === fileA.id &&
                    r.columnA === colA.name &&
                    r.fileBId === fileB.id &&
                    r.columnB === colB.name) ||
                  (r.fileAId === fileB.id &&
                    r.columnA === colB.name &&
                    r.fileBId === fileA.id &&
                    r.columnB === colA.name)
              )

              if (!exists) {
                newRelations.push({
                  fileAId: fileA.id,
                  columnA: colA.name,
                  fileBId: fileB.id,
                  columnB: colB.name,
                  autoDetected: true,
                })
              }
            }
          }
        }
      }
    }

    // 添加新检测到的关联
    newRelations.forEach(r => get().addRelation(r))
  },

  setShowSchemaConfirm: show => set({ showSchemaConfirm: show }),

  confirmSchema: () => set({ showSchemaConfirm: false }),

  markAsStale: (ids) => set((state) => ({
    files: state.files.map(f => ids.includes(f.id) ? { ...f, status: 'out-of-sync' } : f)
  })),

  reloadFile: (fileId, { lastModified, newColumns }) => {
    let droppedRelationsCount = 0;
    set((state) => {
      const file = state.files.find(f => f.id === fileId);
      if (!file) return state;

      const oldColumns = file.columns;
      
      const mergedColumns = newColumns.map(newCol => {
        const oldCol = oldColumns.find(c => c.name === newCol.name);
        
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
          };
        } else {
          return newCol;
        }
      });

      const activeRelations = state.relations.filter(r => {
        let valid = true;
        if (r.fileAId === fileId) {
          if (!mergedColumns.some(c => c.name === r.columnA)) valid = false;
        }
        if (r.fileBId === fileId) {
          if (!mergedColumns.some(c => c.name === r.columnB)) valid = false;
        }
        return valid;
      });

      droppedRelationsCount = state.relations.length - activeRelations.length;

      return {
        files: state.files.map(f => f.id === fileId ? { ...f, columns: mergedColumns, status: 'ready', lastModified } : f),
        relations: activeRelations
      };
    });
    return droppedRelationsCount;
  },

  reset: () => set(initialState),
}))
