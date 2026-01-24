import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import path from 'path'
import fs from 'fs-extra'
import ExcelJS from 'exceljs'
import iconv from 'iconv-lite'

// 1. Mock Electron
vi.mock('electron', () => ({
  app: {
    getAppPath: () => process.cwd(),
    getPath: (name: string) => path.join(process.cwd(), 'tmp', name)
  },
  utilityProcess: {
    fork: vi.fn()
  }
}))

// 2. Mock NativeDatabaseService
const mockQuery = vi.fn()
const mockExec = vi.fn()
const mockClose = vi.fn()

vi.mock('../native-db-service', () => {
  return {
    NativeDatabaseService: class {
      query = mockQuery
      exec = mockExec
      close = mockClose
    }
  }
})

import { FileService } from '../file'
import { NativeDatabaseService } from '../native-db-service'

const TEST_DIR = path.join(process.cwd(), 'tmp', 'test-ingestion')

describe('FileService Integration', () => {
  let fileService: FileService
  let dbService: any

  beforeAll(async () => {
    if (!fs.existsSync(path.join(process.cwd(), 'dist/main/workers/excelWorker.js'))) {
      throw new Error('Worker file not found. Please run "npm run build:main" first.')
    }
    await fs.ensureDir(TEST_DIR)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    dbService = new NativeDatabaseService()
    fileService = new FileService(dbService)
  })

  afterAll(async () => {
    await fs.remove(TEST_DIR)
  })

  it('should inspect and prepare a real Excel file', async () => {
    const xlsxPath = path.join(TEST_DIR, 'real.xlsx')
    
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('MySheet')
    ws.addRow(['ID', 'Name', 'Date'])
    ws.addRow([1, 'Alice', new Date('2023-01-01')])
    await wb.xlsx.writeFile(xlsxPath)

    // 1. Inspect (Real Worker - returns only sheets)
    const inspectRes = await fileService.inspectFile(xlsxPath)
    expect(inspectRes).toHaveLength(1)
    expect(inspectRes[0].sourceName).toBe('MySheet')

    // 2. Prepare (Real Worker + Mock DB)
    mockQuery
      .mockResolvedValueOnce([]) // Preview
      .mockResolvedValueOnce([{ count: 1 }]) // Count

    const prepareRes = await fileService.prepareFile(xlsxPath, 'MySheet')
    
    expect(prepareRes.tempFilePath).toContain('temp_stage_')
    expect(prepareRes.columns).toBeDefined()
  })

  it('should inspect and prepare a GBK CSV file', async () => {
    const csvPath = path.join(TEST_DIR, 'gbk.csv')
    const content = '姓名,年龄\n张三,25'
    const buffer = iconv.encode(content, 'gbk')
    await fs.writeFile(csvPath, buffer)

    // 1. Inspect (Lightweight - returns filename)
    const inspectRes = await fileService.inspectFile(csvPath)
    expect(inspectRes[0].sourceName).toBe('gbk.csv')

    // 2. Prepare (Auto-Detect Encoding)
    // First call: UTF-8 fails
    mockQuery.mockRejectedValueOnce(new Error('Invalid UTF-8'))
    // Second call: GBK succeeds (DESCRIBE)
    mockQuery.mockResolvedValueOnce([
      { column_name: '姓名', column_type: 'VARCHAR' }, 
      { column_name: '年龄', column_type: 'INTEGER' }
    ])
    
    // Then prepareFile continues to get preview and count
    mockQuery
      .mockResolvedValueOnce([]) // Preview data
      .mockResolvedValueOnce([
        { column_name: '姓名', column_type: 'VARCHAR' }, 
        { column_name: '年龄', column_type: 'INTEGER' }
      ]) // Describe again for final
      .mockResolvedValueOnce([{ count: 1 }]) // Count

    const prepareRes = await fileService.prepareFile(csvPath, 'gbk.csv')
    
    expect(prepareRes.readOptions).toEqual(expect.objectContaining({ encoding: 'GBK' }))
  })

  it('should inspect and prepare a JSON file', async () => {
    const jsonPath = path.join(TEST_DIR, 'data.json')
    await fs.writeJson(jsonPath, [{ id: 1, status: 'ok' }])
    await new Promise(r => setTimeout(r, 100))

    // 1. Inspect (Lightweight)
    const inspectRes = await fileService.inspectFile(jsonPath)
    expect(inspectRes[0].sourceName).toBe('data.json')

    // 2. Prepare
    mockQuery
      .mockResolvedValueOnce([
        { column_name: 'id', column_type: 'BIGINT' }, 
        { column_name: 'status', column_type: 'VARCHAR' }
      ]) // DESCRIBE check
      .mockResolvedValueOnce([]) // Preview
      .mockResolvedValueOnce([
        { column_name: 'id', column_type: 'BIGINT' }, 
        { column_name: 'status', column_type: 'VARCHAR' }
      ]) // Describe final
      .mockResolvedValueOnce([{ count: 1 }]) // Count

    const prepareRes = await fileService.prepareFile(jsonPath, 'data.json')
    expect(prepareRes.columns).toBeDefined()
  })
})
