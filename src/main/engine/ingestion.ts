import * as XLSX from 'xlsx'
import * as path from 'path'
import { DatabaseService } from '../database/duckdb'
import { ColumnSchema, ColumnType, TableSchema } from '../../shared/types'
import { processSampleValue } from '../../shared/serialization'

/**
 * 摄取 JSON 数据到 DuckDB（用于 Demo 数据）
 * 使用 registerFileText 方法注册虚拟文件，然后用 read_json_auto 读取
 */
export async function ingestJsonData(
  databaseService: DatabaseService,
  tableName: string,
  rows: any[],
): Promise<TableSchema> {
  if (!rows || rows.length === 0) {
    throw new Error('No data provided')
  }

  const tempFileName = `${tableName}.json`

  try {
    const jsonContent = JSON.stringify(rows)

    await databaseService.registerFileText(tempFileName, jsonContent)

    await databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)

    await databaseService.exec(
      `CREATE TABLE "${tableName}" AS
      SELECT *
      FROM read_json_auto('${tempFileName}', format = 'auto', auto_detect = true)`,
    )

    const columnsResult = await databaseService.query(
      `PRAGMA table_info('${tableName}');`,
    )

    const inferredColumns: ColumnSchema[] = await Promise.all(
      columnsResult.map(async (col: any) => {
        const sampleValues = await getSampleValues(
          databaseService,
          tableName,
          col.name,
          col.type,
        )

        return {
          name: col.name,
          safeName: col.name,
          type: col.type as ColumnType,
          sampleValues,
        }
      }),
    )

    return {
      tableName,
      description: 'Demo Data',
      columns: inferredColumns,
    }
  } finally {
  }
}

// ... (existing code for unmergeCells, normalizeHeaders, findHeaderRow)

function unmergeCells(worksheet: XLSX.WorkSheet): void {
  if (!worksheet['!merges']) {
    return
  }
  for (const merge of worksheet['!merges']) {
    const { s: start, e: end } = merge
    const startCellAddress = XLSX.utils.encode_cell(start)
    const startCell = worksheet[startCellAddress]
    if (startCell) {
      for (let r = start.r; r <= end.r; r++) {
        for (let c = start.c; c <= end.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c })
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { ...startCell, v: startCell.v }
          }
        }
      }
    }
  }
}

function normalizeHeaders(headers: string[]): string[] {
  const counts: { [key: string]: number } = {}
  return headers.map(header => {
    const baseName = header || 'unnamed_column'
    if (counts[baseName] === undefined) {
      counts[baseName] = 0
      return baseName
    } else {
      counts[baseName]++
      return `${baseName}_${counts[baseName]}`
    }
  })
}

function findHeaderRow(data: any[][]): {
  headerRowIndex: number
  headers: string[]
} {
  let headerRowIndex = 0
  let maxNonEmpty = 0

  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i]
    const nonEmptyCount = row.filter(
      cell => cell !== null && cell !== undefined && cell !== '',
    ).length

    if (
      row.length > 0 &&
      nonEmptyCount / row.length > 0.5 &&
      nonEmptyCount > maxNonEmpty
    ) {
      headerRowIndex = i
      maxNonEmpty = nonEmptyCount
    }
  }

  const headers = data[headerRowIndex].map((h: any) => String(h || ''))
  return { headerRowIndex, headers }
}

export async function getSampleValues(
  databaseService: DatabaseService,
  tableName: string,
  columnName: string,
  columnType: string,
): Promise<any[]> {
  const rows = await databaseService.query(
    `SELECT DISTINCT "${columnName}"
     FROM "${tableName}"
     WHERE "${columnName}" IS NOT NULL LIMIT 3`,
  )

  return rows.map((row: any) => {
    const val = row[columnName]
    return processSampleValue(val, columnType)
  })
}

export async function ingestExcelFile(
  fileBuffer: Buffer,
  databaseService: DatabaseService,
  fileName: string,
  targetTableName?: string,
  targetSheetName?: string,
): Promise<TableSchema[]> {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const results: TableSchema[] = []

  // Determine which sheets to process
  let sheetsToProcess: string[] = []
  if (targetSheetName) {
    if (workbook.SheetNames.includes(targetSheetName)) {
      sheetsToProcess = [targetSheetName]
    } else {
      throw new Error(`Sheet "${targetSheetName}" not found in workbook`)
    }
  } else {
    // Check if we are in legacy re-ingest mode (targetTableName provided but no sheetName)
    if (targetTableName && !targetSheetName) {
      // Assume first sheet for backward compatibility or if sheet name wasn't tracked
      sheetsToProcess = [workbook.SheetNames[0]]
    } else {
      sheetsToProcess = workbook.SheetNames
    }
  }
  console.log('ingestExcelFile', 'fileName:', fileName, 'sheetsToProcess:', sheetsToProcess)

  for (const sheetName of sheetsToProcess) {
    const worksheet = workbook.Sheets[sheetName]
    unmergeCells(worksheet)

    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    })

    // Skip empty sheets
    if (data.length === 0) {
      console.warn(`Skipping empty sheet: ${sheetName}`)
      continue
    }

    const { headerRowIndex, headers } = findHeaderRow(data)
    const normalizedHeaders = normalizeHeaders(headers)

    const dataRows = data.slice(headerRowIndex + 1)
    const csvData = [normalizedHeaders, ...dataRows]
      .map(row =>
        row
          .map(cell => {
            const strCell = String(
              cell === null || cell === undefined ? '' : cell,
            )
            return `"${strCell.replace(/"/g, '""')}"`
          })
          .join(','),
      )
      .join('\n')

    let tableName: string
        if (targetTableName && sheetsToProcess.length === 1) {
          tableName = targetTableName
          await databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)
        } else {
          // Pass fileName and sheetName separately to ensure proper handling (e.g. extension removal from fileName)
          tableName = await getUniqueTableName(databaseService, fileName, sheetName)
        }
    const tempFileName = `${tableName}.csv`

    try {
      await databaseService.registerFileText(tempFileName, csvData)

      await databaseService.exec(
        `CREATE TABLE "${tableName}" AS
        SELECT *
        FROM read_csv_auto('${tempFileName}', HEADER = TRUE, SAMPLE_SIZE = -1, auto_detect = true)`,
      )

      const columnsResult = await databaseService.query(
        `PRAGMA table_info('${tableName}');`,
      )

      const columns: ColumnSchema[] = []
      for (const col of columnsResult) {
        const sampleValues = await getSampleValues(
          databaseService,
          tableName,
          col.name,
          col.type,
        )
        columns.push({
          name: col.name,
          safeName: col.name,
          type: col.type as ColumnType,
          sampleValues,
        })
      }
      console.log('Processed Sheet:', sheetName, 'fileName:', fileName, 'Table:', tableName, 'columns:', columns)

      // We pass sheetName in description so it can be extracted later if needed,
      // but ideally we return it structurally.
      // TableSchema doesn't have sheetName field yet.
      // We can append it to description.
      results.push({
        tableName,
        description: workbook.SheetNames.length > 1 ? `${fileName} - ${sheetName}` : fileName,
        columns,
      })
    } catch (e) {
      console.error(`Failed to ingest sheet ${sheetName}:`, e)
      // Continue with other sheets?
    }
  }

  return results
}

export async function getUniqueTableName(
  databaseService: DatabaseService,
  originalName: string,
  sheetName?: string,
): Promise<string> {
  let baseName = path.parse(originalName).name
  
  if (sheetName) {
    baseName = `${baseName}_${sheetName}`
  }

  // Allow Chinese, alphanum, underscore. Replace others with _
  let safeName = 't_' + baseName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')
  // Trim underscores
  safeName = safeName.replace(/_+/g, '_').replace(/_$/, '')

  let currentName = safeName
  let counter = 1

  while (true) {
    const exists = await databaseService.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_name = '${currentName}'
         AND table_schema = 'main'`,
    )

    if (!exists || exists.length === 0) return currentName
    currentName = `${safeName}_${counter++}`
  }
}
