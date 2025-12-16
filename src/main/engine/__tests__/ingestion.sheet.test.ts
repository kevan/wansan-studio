import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as XLSX from 'xlsx'
import { ingestExcelFile } from '../ingestion'
import { DatabaseService } from '../../database/duckdb'

// Mock electron
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => process.cwd(), // Assuming test runs from root
  },
}))

describe('ingestExcelFile Sheet Selection', () => {
  const testDir = path.join(process.cwd(), 'temp_test_sheets')
  const filePath = path.join(testDir, 'multi_sheet.xlsx')
  let dbService: DatabaseService

  beforeAll(async () => {
    await fs.ensureDir(testDir)
    
    // Create multi-sheet Excel
    const wb = XLSX.utils.book_new()
    
    // Sheet 1
    const data1 = [['ColA', 'ColB'], [1, 2]]
    const ws1 = XLSX.utils.aoa_to_sheet(data1)
    XLSX.utils.book_append_sheet(wb, ws1, 'Sheet1')
    
    // Sheet 2
    const data2 = [['ColC', 'ColD'], [3, 4]]
    const ws2 = XLSX.utils.aoa_to_sheet(data2)
    XLSX.utils.book_append_sheet(wb, ws2, 'Sheet2')
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    await fs.writeFile(filePath, buffer)

    // Mock DatabaseService
    dbService = {
      registerFileText: vi.fn(),
      exec: vi.fn(),
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('PRAGMA table_info')) {
            return [{ name: 'test_col', type: 'VARCHAR' }]
        }
        return []
      }),
      getSchema: vi.fn(),
    } as any
  })

  afterAll(async () => {
    await fs.remove(testDir)
  })

  it('should ingest only the specified sheet when targetSheetName is provided', async () => {
    const fileBuffer = await fs.readFile(filePath)
    const registerSpy = vi.spyOn(dbService, 'registerFileText')
    
    const result = await ingestExcelFile(
      fileBuffer,
      dbService,
      'multi_sheet.xlsx',
      'target_table_sheet2',
      'Sheet2'
    )

    expect(result).toHaveLength(1)
    
    // Verify that registerFileText was called with content from Sheet2
    const lastCall = registerSpy.mock.lastCall
    if (lastCall) {
        const csvContent = lastCall[1] as string
        // Sheet2 has ColC
        expect(csvContent).toContain('ColC')
        // Should NOT have ColA (from Sheet1)
        expect(csvContent).not.toContain('ColA')
    } else {
        throw new Error('registerFileText was not called')
    }
  })
  
  it('should ingest first sheet if targetSheetName is NOT provided but tableName IS (legacy mode)', async () => {
    const fileBuffer = await fs.readFile(filePath)
    const registerSpy = vi.spyOn(dbService, 'registerFileText')
    
    // Reset spy history
    registerSpy.mockClear()
    
    await ingestExcelFile(
      fileBuffer,
      dbService,
      'multi_sheet.xlsx',
      'target_table_legacy',
      undefined
    )
    
    const lastCall = registerSpy.mock.lastCall
    if (lastCall) {
        const csvContent = lastCall[1] as string
        // Sheet1 has ColA
        expect(csvContent).toContain('ColA')
        // Should NOT have ColC
        expect(csvContent).not.toContain('ColC')
    } else {
        throw new Error('registerFileText was not called')
    }
  })
})
