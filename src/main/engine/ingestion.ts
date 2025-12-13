import * as XLSX from 'xlsx'
import fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import { DatabaseService } from '../database/duckdb'
import { TableSchema, ColumnSchema, ColumnType } from '../../shared/types'

/**
 * 摄取 JSON 数据到 DuckDB（用于 Demo 数据）
 * 使用 registerFileText 方法注册虚拟文件，然后用 read_json_auto 读取
 */
export async function ingestJsonData(
  databaseService: DatabaseService,
  tableName: string,
  rows: any[]
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
      `CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${tempFileName}', format='auto', auto_detect=true)`
    )

    const columnsResult = await databaseService.query(
      `PRAGMA table_info('${tableName}');`
    )

    const inferredColumns: ColumnSchema[] = await Promise.all(
      columnsResult.map(async (col: any) => {
        const sampleValues = await getSampleValues(
          databaseService,
          tableName,
          col.name
        )

        return {
          name: col.name,
          safeName: col.name,
          type: col.type as ColumnType,
          sampleValues,
        }
      })
    )

    return {
      tableName,
      description: 'Demo Data',
      columns: inferredColumns,
    }
  } finally {
  }
}

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
      cell => cell !== null && cell !== undefined && cell !== ''
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
  columnName: string
): Promise<any[]> {
  const rows = await databaseService.query(
    `SELECT DISTINCT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT 3`
  )
  return rows.map((row: any) => {
    const val = row[columnName]
    return typeof val === 'bigint' ? val.toString() : val
  })
}

export async function ingestExcelFile(
  fileBuffer: Buffer,
  databaseService: DatabaseService,
  fileName: string,
  targetTableName?: string
): Promise<TableSchema> {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  unmergeCells(worksheet)

  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  })
  if (data.length === 0) {
    throw new Error('Sheet is empty.')
  }

  const { headerRowIndex, headers } = findHeaderRow(data)
  const normalizedHeaders = normalizeHeaders(headers)

  const dataRows = data.slice(headerRowIndex + 1)
  const csvData = [normalizedHeaders, ...dataRows]
    .map(row =>
      row
        .map(cell => {
          const strCell = String(
            cell === null || cell === undefined ? '' : cell
          )
          return `"${strCell.replace(/"/g, '""')}"`
        })
        .join(',')
    )
    .join('\n')

  let tableName: string
  if (targetTableName) {
    tableName = targetTableName
    await databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)
  } else {
    tableName = await getUniqueTableName(databaseService, fileName)
  }

  const tempFileName = `${tableName}.csv`

  try {
    await databaseService.registerFileText(tempFileName, csvData)

    await databaseService.exec(
      `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${tempFileName}', HEADER=TRUE, SAMPLE_SIZE=-1, auto_detect=true)`
    )

    const columnsResult = await databaseService.query(
      `PRAGMA table_info('${tableName}');`
    )

    const columns: ColumnSchema[] = []
    for (const col of columnsResult) {
      const sampleValues = await getSampleValues(databaseService, tableName, col.name)
      columns.push({
        name: col.name,
        safeName: col.name,
        type: col.type as ColumnType,
        sampleValues,
      })
    }

    return { tableName, description: fileName, columns }
  } finally {
  }
}

export async function getUniqueTableName(
  databaseService: DatabaseService,
  originalName: string
): Promise<string> {
  const baseName = path.parse(originalName).name
  // Allow Chinese, alphanum, underscore. Replace others with _
  let safeName = 't_' + baseName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')
  // Trim underscores
  safeName = safeName.replace(/_+/g, '_').replace(/_$/, '')

  let currentName = safeName
  let counter = 1

  while (true) {
    const exists = await databaseService.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = '${currentName}' AND table_schema = 'main'`
    )

    if (!exists || exists.length === 0) return currentName
    currentName = `${safeName}_${counter++}`
  }
}
