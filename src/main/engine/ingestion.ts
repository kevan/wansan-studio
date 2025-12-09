import * as XLSX from 'xlsx'
import fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import duckdb from 'duckdb'
import { TableSchema, ColumnSchema, ColumnType } from '../../shared/types'

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

  const headers = data[headerRowIndex].map(h => String(h || ''))
  return { headerRowIndex, headers }
}

async function getSampleValues(
  db: duckdb.Database,
  tableName: string,
  columnName: string
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT "${columnName}" FROM "${tableName}" WHERE "${columnName}" IS NOT NULL LIMIT 3`,
      (err, res) => {
        if (err) return reject(err)
        const samples = res.map(row => {
          const val = row[columnName]
          return typeof val === 'bigint' ? val.toString() : val
        })
        resolve(samples)
      }
    )
  })
}

export async function ingestExcelFile(
  fileBuffer: Buffer,
  db: duckdb.Database,
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
    await new Promise<void>((resolve, reject) => {
      db.exec(`DROP TABLE IF EXISTS "${tableName}"`, err => {
        if (err) return reject(err)
        resolve()
      })
    })
  } else {
    tableName = await getUniqueTableName(db, fileName)
  }

  const tempFilePath = path.join(os.tmpdir(), `${tableName}.csv`)

  try {
    await fs.writeFile(tempFilePath, csvData, 'utf-8')

    await new Promise<void>((resolve, reject) => {
      db.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${tempFilePath.replace(/\\/g, '/')}', HEADER=TRUE);`,
        err => {
          if (err) return reject(err)
          resolve()
        }
      )
    })

    const columnsResult = await new Promise<any[]>((resolve, reject) => {
      db.all(`PRAGMA table_info('${tableName}');`, (err, res) => {
        if (err) return reject(err)
        resolve(res)
      })
    })

    const columns: ColumnSchema[] = []
    for (const col of columnsResult) {
      const sampleValues = await getSampleValues(db, tableName, col.name)
      columns.push({
        name: col.name,
        safeName: col.name, // Already safe due to normalization
        type: col.type as ColumnType,
        sampleValues,
      })
    }

    return { tableName, description: fileName, columns }
  } finally {
    await fs
      .unlink(tempFilePath)
      .catch(err =>
        console.error(`Failed to delete temp file: ${tempFilePath}`, err)
      )
  }
}

export async function getUniqueTableName(
  db: duckdb.Database,
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
    const exists = await new Promise<boolean>(resolve => {
      db.all(
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${currentName}' AND table_schema = 'main'`,
        (err, res) => {
          if (err) {
            console.error(err)
            resolve(false)
          } else resolve(res && res.length > 0)
        }
      )
    })

    if (!exists) return currentName
    currentName = `${safeName}_${counter++}`
  }
}
