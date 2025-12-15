import { parentPort, workerData } from 'worker_threads'
import * as XLSX from 'xlsx'

interface WorkerData {
  fileBuffer: Buffer
  targetSheetName?: string
  targetTableName?: string
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

try {
  const { fileBuffer, targetSheetName, targetTableName } =
    workerData as WorkerData
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const results: { sheetName: string; csvData: string; error?: string }[] = []

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

  for (const sheetName of sheetsToProcess) {
    try {
      const worksheet = workbook.Sheets[sheetName]
      unmergeCells(worksheet)

      const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
      })

      if (data.length === 0) {
        // Skip empty
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
                cell === null || cell === undefined ? '' : cell
              )
              return `"${strCell.replace(/"/g, '""')}"`
            })
            .join(',')
        )
        .join('\n')

      results.push({ sheetName, csvData })
    } catch (e: any) {
      results.push({ sheetName, csvData: '', error: e.message })
    }
  }

  parentPort?.postMessage({
    success: true,
    data: results,
    allSheetsCount: workbook.SheetNames.length,
  })
} catch (error: any) {
  parentPort?.postMessage({ success: false, error: error.message })
}
