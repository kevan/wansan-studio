/**
 * Tree data transformation utilities
 * 将 Store 数据转换为 react-arborist 树数据结构
 */

import { FileAsset, Relation, ColumnSchema } from '../../stores/useFileStore'

// 树节点类型
export type TreeNodeType = 'file' | 'column' | 'group' | 'relation'

// 列类型映射
export type ColumnDisplayType = 'string' | 'number' | 'date' | 'boolean' | 'unknown'

// 树节点数据接口
export interface TreeNodeData {
  id: string
  name: string
  type: TreeNodeType
  // File 相关
  fileId?: string
  fileName?: string
  fileStatus?: string
  // Column 相关
  columnName?: string
  columnType?: ColumnDisplayType
  isKey?: boolean
  // Relation 相关
  sourceFileId?: string
  sourceColId?: string
  targetFileId?: string
  targetColId?: string
  relationId?: string
  // 子节点
  children?: TreeNodeData[]
}

/**
 * 将 ColumnSchema 的类型映射到显示类型
 */
function mapColumnType(type: string): ColumnDisplayType {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('decimal') || lowerType.includes('numeric')) {
    return 'number'
  }
  if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
    return 'date'
  }
  if (lowerType.includes('bool')) {
    return 'boolean'
  }
  if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('string') || lowerType.includes('char')) {
    return 'string'
  }
  return 'unknown'
}

/**
 * 将 FileAsset 转换为树节点
 */
function fileToTreeNode(file: FileAsset): TreeNodeData {
  const children: TreeNodeData[] = file.columns.map((col: ColumnSchema) => ({
    id: `col_${file.id}_${col.name}`,
    name: col.name,
    type: 'column' as TreeNodeType,
    fileId: file.id,
    fileName: file.name,
    columnName: col.name,
    columnType: mapColumnType(col.type),
    isKey: col.isKey,
  }))

  return {
    id: `file_${file.id}`,
    name: file.name,
    type: 'file',
    fileId: file.id,
    fileName: file.name,
    fileStatus: file.status,
    children: children.length > 0 ? children : undefined,
  }
}

/**
 * 将 Relation 转换为树节点
 */
function relationToTreeNode(relation: Relation, files: FileAsset[]): TreeNodeData | null {
  const sourceFile = files.find(f => f.id === relation.fileAId)
  const targetFile = files.find(f => f.id === relation.fileBId)
  
  if (!sourceFile || !targetFile) return null

  const name = `${sourceFile.name}.${relation.columnA} → ${targetFile.name}.${relation.columnB}`

  return {
    id: `rel_${relation.id}`,
    name,
    type: 'relation',
    relationId: relation.id,
    sourceFileId: relation.fileAId,
    sourceColId: relation.columnA,
    targetFileId: relation.fileBId,
    targetColId: relation.columnB,
  }
}

/**
 * 将 Store 数据转换为树数据结构
 */
export function buildTreeData(files: FileAsset[], relations: Relation[]): TreeNodeData[] {
  const treeData: TreeNodeData[] = []

  // 添加文件节点
  files.forEach(file => {
    treeData.push(fileToTreeNode(file))
  })

  // 如果有关联关系，添加关联组
  if (relations.length > 0) {
    const relationNodes = relations
      .map(rel => relationToTreeNode(rel, files))
      .filter((node): node is TreeNodeData => node !== null)

    if (relationNodes.length > 0) {
      treeData.push({
        id: 'group_relations',
        name: 'Relations',
        type: 'group',
        children: relationNodes,
      })
    }
  }

  return treeData
}

/**
 * 从树节点 ID 中提取实际的文件/列 ID
 */
export function parseNodeId(nodeId: string): { type: TreeNodeType; id: string; parentId?: string } {
  if (nodeId.startsWith('file_')) {
    return { type: 'file', id: nodeId.replace('file_', '') }
  }
  if (nodeId.startsWith('col_')) {
    const parts = nodeId.replace('col_', '').split('_')
    // 格式: col_{fileId}_{columnName}
    const fileId = parts[0]
    const columnName = parts.slice(1).join('_')
    return { type: 'column', id: columnName, parentId: fileId }
  }
  if (nodeId.startsWith('rel_')) {
    return { type: 'relation', id: nodeId.replace('rel_', '') }
  }
  if (nodeId.startsWith('group_')) {
    return { type: 'group', id: nodeId.replace('group_', '') }
  }
  return { type: 'file', id: nodeId }
}

