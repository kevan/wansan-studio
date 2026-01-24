import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileService } from '../file'

const mockQuery = vi.fn()
const mockExec = vi.fn()

vi.mock('../native-db-service', () => ({
  NativeDatabaseService: class {
    query = mockQuery
    exec = mockExec
  },
}))

describe('FileService Unit', () => {
  let fileService: FileService
  let dbService: any

  beforeEach(() => {
    vi.clearAllMocks()
    dbService = { query: mockQuery, exec: mockExec }
    fileService = new FileService(dbService)
  })

  it('should inspect a CSV file (identity)', async () => {
    const result = await fileService.inspectFile('test.csv')
    expect(result).toHaveLength(1)
    expect(result[0].sourceName).toBe('test.csv')
  })

  it('should prepare a CSV file with default encoding', async () => {
    mockQuery.mockResolvedValueOnce([
      { column_name: 'id', column_type: 'INTEGER' },
      { column_name: 'name', column_type: 'VARCHAR' }
    ]) // DESCRIBE
    mockQuery.mockResolvedValueOnce([{ id: 1, name: 'A' }]) // Preview
    mockQuery.mockResolvedValueOnce([
      { column_name: 'id', column_type: 'INTEGER' },
      { column_name: 'name', column_type: 'VARCHAR' }
    ]) // DESCRIBE final
    mockQuery.mockResolvedValueOnce([{ count: 1 }]) // Count

    const result = await fileService.prepareFile('test.csv', 'test.csv')
    expect(result.rowCount).toBe(1)
    expect(result.columns).toHaveLength(2)
    expect(result.readOptions).toEqual({ auto_detect: true })
  })

  it('should detect GBK encoding for CSV', async () => {
    // 1. Default (UTF-8) fails
    mockQuery.mockRejectedValueOnce(new Error('Invalid encoding'))
    // 2. GBK succeeds
    mockQuery.mockResolvedValueOnce([
      { column_name: '姓名', column_type: 'VARCHAR' }
    ])
    
    // Prepare continues
    mockQuery.mockResolvedValueOnce([{ 姓名: '张三' }]) // Preview
    mockQuery.mockResolvedValueOnce([
      { column_name: '姓名', column_type: 'VARCHAR' }
    ]) // DESCRIBE final
    mockQuery.mockResolvedValueOnce([{ count: 1 }]) // Count

    const result = await fileService.prepareFile('gbk.csv', 'gbk.csv')
    expect(result.readOptions).toEqual({ encoding: 'GBK', auto_detect: true })
  })
})