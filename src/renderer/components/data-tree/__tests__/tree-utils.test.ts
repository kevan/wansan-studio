import { describe, it, expect } from 'vitest'
import { buildTreeData, parseNodeId } from '../tree-utils'
import { FileAsset, Relation } from '../../../stores/useFileStore'

describe('tree-utils', () => {
  describe('buildTreeData', () => {
    it('should create root folders', () => {
      const tree = buildTreeData([], [])
      expect(tree).toHaveLength(2)
      expect(tree[0].id).toBe('root_files')
      expect(tree[1].id).toBe('root_relations')
    })

    it('should transform files and columns correctly', () => {
      const mockFile: FileAsset = {
        id: 'file_1',
        name: 'test.csv',
        path: '/tmp/test.csv',
        tableName: 't_test',
        status: 'ready',
        createdAt: 123456,
        columns: [
          { name: 'id', safeName: 'id', type: 'INTEGER', sampleValues: [] },
          { name: 'name', safeName: 'name', type: 'VARCHAR', sampleValues: [] }
        ]
      }

      const tree = buildTreeData([mockFile], [])
      const fileNode = tree[0].children?.[0]

      expect(fileNode).toBeDefined()
      expect(fileNode?.id).toBe('file:file_1')
      expect(fileNode?.name).toBe('t_test') // Uses tableName
      expect(fileNode?.children).toHaveLength(2)

      const col1 = fileNode?.children?.[0]
      expect(col1?.id).toBe('col:file_1:id')
      expect(col1?.type).toBe('column')
      expect(col1?.columnType).toBe('INTEGER')
    })

    it('should mark foreign keys', () => {
      const mockFile1: FileAsset = {
        id: 'f1', name: 'orders', path: '', tableName: 't_orders', status: 'ready', createdAt: 0,
        columns: [{ name: 'user_id', safeName: 'user_id', type: 'INTEGER', sampleValues: [] }]
      }
      const mockFile2: FileAsset = {
        id: 'f2', name: 'users', path: '', tableName: 't_users', status: 'ready', createdAt: 0,
        columns: [{ name: 'id', safeName: 'id', type: 'INTEGER', sampleValues: [] }]
      }
      
      const mockRelation: Relation = {
        id: 'r1',
        fileAId: 'f1', columnA: 'user_id',
        fileBId: 'f2', columnB: 'id'
      }

      const tree = buildTreeData([mockFile1, mockFile2], [mockRelation])
      
      // Check Orders -> user_id
      const ordersNode = tree[0].children?.find(n => n.fileId === 'f1')
      const userIdNode = ordersNode?.children?.find(n => n.columnName === 'user_id')
      expect(userIdNode?.isForeignKey).toBe(true)

      // Check Users -> id
      const usersNode = tree[0].children?.find(n => n.fileId === 'f2')
      const idNode = usersNode?.children?.find(n => n.columnName === 'id')
      expect(idNode?.isForeignKey).toBe(true)
    })
  })

  describe('parseNodeId', () => {
    it('should parse file IDs', () => {
      expect(parseNodeId('file:123')).toEqual({ type: 'file', id: '123' })
    })

    it('should parse column IDs', () => {
      expect(parseNodeId('col:123:name')).toEqual({ type: 'column', parentId: '123', id: 'name' })
    })

    it('should parse relation IDs', () => {
      expect(parseNodeId('rel:456')).toEqual({ type: 'relation', id: '456' })
    })

    it('should handle root nodes', () => {
      expect(parseNodeId('root_files')).toEqual({ type: 'folder', id: 'root_files' })
    })
  })
})
