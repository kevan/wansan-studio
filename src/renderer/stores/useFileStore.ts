import { create } from 'zustand'

// 文件状态类型
export type FileStatus = 'uploading' | 'processing' | 'ready' | 'error'

// 列 Schema 类型
export interface ColumnSchema {
  name: string
  type: string
  nullable: boolean
  isKey?: boolean // 是否为 Join Key
}

// 文件资产类型
export interface FileAsset {
  id: string
  name: string
  path: string
  tableName: string // DuckDB 中的表名
  status: FileStatus
  size?: number
  columns: ColumnSchema[]
  rowCount?: number
  error?: string
  createdAt: number
}

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
  files: FileAsset[]

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
  addFile: (file: Omit<FileAsset, 'id' | 'createdAt'>) => string
  updateFile: (id: string, updates: Partial<FileAsset>) => void
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
    const newFile: FileAsset = {
      ...file,
      id,
      createdAt: Date.now(),
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

  reset: () => set(initialState),
}))
