import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileService } from '../file'
import { NativeDatabaseService } from '../native-db-service'
import * as ingestion from '../../engine/ingestion'
import path from 'path'

// Mock dependencies
vi.mock('../native-db-service')
vi.mock('../../engine/ingestion')
vi.mock('fs-extra', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readFile: vi.fn(),
    stat: vi.fn(() => Promise.resolve({ size: 1024, mtimeMs: 1000 })),
    open: vi.fn(),
    read: vi.fn(),
    close: vi.fn(),
    remove: vi.fn(),
  }
}))

describe('FileService', () => {
  let fileService: FileService
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = new NativeDatabaseService()
    // Mock query implementation
    mockDb.query = vi.fn()
    mockDb.exec = vi.fn()
    fileService = new FileService(mockDb)
  })

  describe('inspectFile (Stage 1)', () => {
    it('should inspect Excel files using Worker', async () => {
      const mockResult = [{ sourceName: 'Sheet1', previewHeaders: ['A', 'B'] }]
      // @ts-ignore
      ingestion.ingestExcelFile.mockResolvedValue(mockResult)

      const result = await fileService.inspectFile('test.xlsx')

      expect(ingestion.ingestExcelFile).toHaveBeenCalledWith(
        'test.xlsx',
        expect.anything(),
        'test.xlsx',
        undefined,
        undefined,
        undefined,
        't_',
        undefined,
        undefined,
        'inspect'
      )
      expect(result).toEqual(mockResult)
    })

    it('should inspect CSV files using DuckDB DESCRIBE (UTF-8)', async () => {
      // Mock DuckDB DESCRIBE response
      mockDb.query.mockResolvedValue([
        { column_name: 'id', column_type: 'INTEGER' },
        { column_name: 'name', column_type: 'VARCHAR' }
      ])

      const result = await fileService.inspectFile('data.csv')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("read_csv_auto('data.csv', auto_detect=true)")
      )
      expect(result[0].previewHeaders).toEqual(['id', 'name'])
      expect(result[0].readOptions).toEqual({ auto_detect: true })
    })

    it('should fallback to GBK if UTF-8 fails for CSV', async () => {
      // First call fails (UTF-8)
      mockDb.query.mockRejectedValueOnce(new Error('Invalid UTF-8'))
      // Second call succeeds (GBK)
      mockDb.query.mockResolvedValueOnce([
        { column_name: '姓名', column_type: 'VARCHAR' }
      ])

      const result = await fileService.inspectFile('gbk.csv')

      expect(result[0].readOptions).toEqual({ encoding: 'GBK', auto_detect: true })
      expect(result[0].previewHeaders).toEqual(['姓名'])
    })

    it('should inspect Parquet files using DuckDB', async () => {
      mockDb.query.mockResolvedValue([
        { column_name: 'ts', column_type: 'TIMESTAMP' }
      ])

      const result = await fileService.inspectFile('log.parquet')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("DESCRIBE SELECT * FROM read_parquet('log.parquet')")
      )
      expect(result[0].previewHeaders).toEqual(['ts'])
    })
  })

  describe('prepareFile (Stage 2)', () => {
    it('should prepare Excel files via Worker conversion', async () => {
      const mockSchema = {
        tableName: 'temp_stage_123',
        columns: [],
        tempFilePath: '/tmp/converted.csv'
      }
      // @ts-ignore
      ingestion.ingestExcelFile.mockResolvedValue([mockSchema])
      
      mockDb.query
        .mockResolvedValueOnce([]) // Preview data
        .mockResolvedValueOnce([{ count: 100 }]) // Count

      const result = await fileService.prepareFile('test.xlsx', 'Sheet1')

      expect(ingestion.ingestExcelFile).toHaveBeenCalledWith(
        'test.xlsx',
        expect.anything(),
        'test.xlsx',
        undefined,
        'Sheet1',
        undefined,
        'temp_stage_'
      )
      expect(result.tempFilePath).toBe('/tmp/converted.csv')
      expect(result.rowCount).toBe(100)
    })

    it('should prepare CSV files by passing through (No-Op Staging)', async () => {
      mockDb.query
        .mockResolvedValueOnce([]) // Preview
        .mockResolvedValueOnce([
          { column_name: 'id', column_type: 'BIGINT' }
        ]) // Describe
        .mockResolvedValueOnce([{ count: 500 }]) // Count

      const readOptions = { encoding: 'GBK' }
      const result = await fileService.prepareFile('data.csv', 'data.csv', readOptions)

      // Should use the readOptions passed from inspect
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("read_csv_auto('data.csv', auto_detect=true, encoding='GBK')")
      )
      // For CSV, tempFilePath is the original path
      expect(result.tempFilePath).toBe('data.csv')
      expect(result.rowCount).toBe(500)
    })
  })
})
