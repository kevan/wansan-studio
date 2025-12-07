import { FileNode, Relation, SyncStatus } from '../../stores/useFileStore'

export interface TreeNodeData {
  id: string
  name: string
  type: 'folder' | 'file' | 'column' | 'relation'
  children?: TreeNodeData[]
  // Original data references
  fileId?: string
  columnName?: string
  relationId?: string
  // Display metadata
  columnType?: string
  isKey?: boolean // Is Primary Key (or similar concept in our simple app)
  isForeignKey?: boolean // Is part of a relation
  status?: SyncStatus
}

export const NODE_TYPES = {
  FOLDER: 'folder',
  FILE: 'file',
  COLUMN: 'column',
  RELATION: 'relation',
} as const

/**
 * Transforms Store data into a Tree structure
 */
export function buildTreeData(
  files: FileNode[],
  relations: Relation[]
): TreeNodeData[] {
  // 1. Build File Nodes (Data Sources)
  const fileNodes: TreeNodeData[] = files.map(file => {
    // Check if any column in this file is involved in a relation
    const relatedColumns = new Set<string>()
    relations.forEach(rel => {
      if (rel.fileAId === file.id) relatedColumns.add(rel.columnA)
      if (rel.fileBId === file.id) relatedColumns.add(rel.columnB)
    })

    const columnNodes: TreeNodeData[] = file.columns.map(col => ({
      id: `col:${file.id}:${col.name}`,
      name: col.name,
      type: 'column',
      fileId: file.id,
      columnName: col.name,
      columnType: col.type,
      isKey: col.isKey,
      isForeignKey: relatedColumns.has(col.name),
    }))

    return {
      id: `file:${file.id}`,
      name: file.tableName || file.name, // Prefer tableName (e.g. t_orders)
      type: 'file',
      fileId: file.id,
      children: columnNodes,
      status: file.status,
    }
  })

  // 2. Build Relation Nodes
  const relationNodes: TreeNodeData[] = relations.map(rel => {
    const fileA = files.find(f => f.id === rel.fileAId)
    const fileB = files.find(f => f.id === rel.fileBId)
    
    // Fallback names if file not found (shouldn't happen)
    const tableA = fileA?.tableName || rel.fileAId
    const tableB = fileB?.tableName || rel.fileBId

    return {
      id: `rel:${rel.id}`,
      name: `${tableA} ↔ ${tableB}`,
      type: 'relation',
      relationId: rel.id,
    }
  })

  // 3. Construct Root Nodes
  const rootNodes: TreeNodeData[] = [
    {
      id: 'root_files',
      name: 'Data Sources',
      type: 'folder',
      children: fileNodes,
    },
    {
      id: 'root_relations',
      name: 'Relationships',
      type: 'folder',
      children: relationNodes,
    },
  ]

  return rootNodes
}

/**
 * Helper to parse node IDs for actions
 */
export function parseNodeId(id: string) {
  const parts = id.split(':')
  // Handle root nodes
  if (id.startsWith('root_')) {
    return { type: 'folder', id }
  }
  
  const type = parts[0]
  
  if (type === 'file') {
    return { type: 'file', id: parts[1] }
  }
  
  if (type === 'col') {
    return { type: 'column', parentId: parts[1], id: parts[2] } // id here is columnName
  }

  if (type === 'rel') {
    return { type: 'relation', id: parts[1] }
  }

  return { type: 'unknown', id }
}