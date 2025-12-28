import ExcelJS from 'exceljs'
import * as fs from 'fs'
import * as path from 'path'

export interface ExcelProcessResult {
  sheetName: string
  csvData: string
  error?: string
}

export function normalizeHeaders(headers: string[]): string[] {
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

export function findHeaderRow(data: any[][]): {
  headerRowIndex: number
  headers: string[]
} {
  let headerRowIndex = 0
  let maxNonEmpty = 0

  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i]
    if (!row) continue
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

  const headers = data[headerRowIndex]?.map((h: any) => String(h || '')) || []
  return { headerRowIndex, headers }
}

export interface StreamingProcessResult {
  sheetName: string
  csvFilePath: string
  rowCount: number
  error?: string
}

/**
 * Helper to check if an Excel number format string represents a date
 */
function isDateFmt(fmt: string): boolean {
  if (!fmt) return false
  const f = fmt.toLowerCase()
  // Excel date formats typically contain y, m, d, h, s or Chinese date characters
  // We exclude formats that are purely numeric but happen to have 'd' (like [Red])
  if (f.includes('red') || f.includes('blue')) return false
  return /[ymdhs年\u6708\u65e5]/.test(f)
}

/**
 * Process Excel file using Streaming Reader (Low Memory)
 */
export async function processExcelFileStreaming(
  filePath: string,
  outputDir: string,
  targetSheetName?: string,
  targetTableName?: string,
  onProgress?: (rowCount: number) => void
): Promise<{ results: StreamingProcessResult[]; allSheetsCount: number }> {
  const options = {
    sharedStrings: 'cache' as const,
    styles: 'cache' as const,
    hyperlinks: 'emit' as const,
    worksheets: 'emit' as const,
  }

  // @ts-ignore
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
    filePath,
    options
  )
  const results: StreamingProcessResult[] = []
  let sheetCount = 0

  for await (const worksheetReader of workbookReader) {
    sheetCount++
    const sheetName = (worksheetReader as any).name

    // Filter logic
    let shouldProcess = false
    if (targetSheetName) {
      if (sheetName === targetSheetName) shouldProcess = true
    } else if (targetTableName && !targetSheetName) {
      if (sheetCount === 1) shouldProcess = true
    } else {
      shouldProcess = true
    }

    if (!shouldProcess) {
      for await (const _row of worksheetReader) {
        /* consume */
      }
      continue
    }

    try {
      const tempCsvName = `temp_ingest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.csv`
      const csvFilePath = path.join(outputDir, tempCsvName)
      const writeStream = fs.createWriteStream(csvFilePath, {
        encoding: 'utf8',
      })

      // Buffer for header detection
      const ROW_BUFFER_SIZE = 50
      const rowBuffer: any[][] = []
      let headersFound = false
      let headerRowIndex = 0
      let normalizedHeaders: string[] = []
      let colCount = 0
      let rowCount = 0
      let rawRowIndex = -1

      // Helper to process a row into CSV line
      const processRowToCSV = (rowValues: any[]) => {
        const rowData: string[] = []
        for (let i = 0; i < colCount; i++) {
          const cell = rowValues[i]
          let strCell = ''

          if (cell === null || cell === undefined) {
            strCell = ''
          } else if (cell instanceof Date && !isNaN(cell.getTime())) {
            const time = cell.getTime()
            const roundedTime = Math.round(time / 1000) * 1000
            const roundedDate = new Date(roundedTime)

            const year = roundedDate.getUTCFullYear()
            const month = String(roundedDate.getUTCMonth() + 1).padStart(2, '0')
            const day = String(roundedDate.getUTCDate()).padStart(2, '0')
            const hours = roundedDate.getUTCHours()
            const minutes = roundedDate.getUTCMinutes()
            const seconds = roundedDate.getUTCSeconds()

            if (hours === 0 && minutes === 0 && seconds === 0) {
              strCell = `${year}-${month}-${day}`
            } else {
              const h = String(hours).padStart(2, '0')
              const min = String(minutes).padStart(2, '0')
              const s = String(seconds).padStart(2, '0')
              strCell = `${year}-${month}-${day}T${h}:${min}:${s}.000`
            }
          } else {
            strCell = String(cell)
          }
          rowData.push(`"${strCell.replace(/"/g, '""')}"`)
        }
        return rowData.join(',')
      }

      // Iterate rows in the sheet
      for await (const row of worksheetReader) {
        rawRowIndex++

        // In streaming mode, row.values is fast but row.getCell is needed for styles
        // We iterate manually to handle Date serial conversion if styles are available
        const values: any[] = []
        const rowValues = row.values as any[]
        const maxCol = Array.isArray(rowValues) ? rowValues.length - 1 : 0

        for (let i = 1; i <= maxCol; i++) {
          const cell = row.getCell(i)
          let val = cell.value

          // [FIX] Handle Excel Serial Dates that are inferred as numbers
          if (
            typeof val === 'number' &&
            cell.numFmt &&
            isDateFmt(cell.numFmt)
          ) {
            // Excel epoch is 1899-12-30 (25569 days before Unix epoch)
            const date = new Date(Math.round((val - 25569) * 86400 * 1000))
            if (!isNaN(date.getTime())) {
              val = date
            }
          }

          // Handle Rich Text / Hyperlinks
          if (val && typeof val === 'object' && !(val instanceof Date)) {
            if ('richText' in val && Array.isArray((val as any).richText)) {
              val = (val as any).richText.map((t: any) => t.text).join('')
            } else if ('text' in val && 'hyperlink' in val) {
              val = (val as any).text
            } else if ('result' in val) {
              val = (val as any).result
              if (val && typeof val === 'object' && !(val instanceof Date)) {
                if ('error' in val) val = (val as any).error
                else val = JSON.stringify(val)
              }
            } else {
              // Fallback
              try {
                val = JSON.stringify(val)
              } catch {
                val = String(val)
              }
            }
          }
          values[i - 1] = val
        }

        if (!headersFound) {
          rowBuffer.push(values)

          if (rowBuffer.length >= ROW_BUFFER_SIZE) {
            // Try detect
            const { headerRowIndex: foundIndex, headers } =
              findHeaderRow(rowBuffer)
            headerRowIndex = foundIndex
            normalizedHeaders = normalizeHeaders(headers)
            colCount = normalizedHeaders.length

            // Write Header
            const headerLine = normalizedHeaders
              .map(h => `"${String(h).replace(/"/g, '""')}"`)
              .join(',')
            writeStream.write(headerLine + '\n')

            // Flush Buffer (from headerRowIndex + 1)
            for (let i = headerRowIndex + 1; i < rowBuffer.length; i++) {
              const buffRow = rowBuffer[i]
              // Filter empty rows
              if (
                buffRow.some(
                  c => c !== null && c !== undefined && String(c).trim() !== ''
                )
              ) {
                writeStream.write(processRowToCSV(buffRow) + '\n')
                rowCount++
                if (onProgress && rowCount % 5000 === 0) onProgress(rowCount)
              }
            }
            headersFound = true
            rowBuffer.length = 0 // Clear memory
          }
        } else {
          // Stream mode: process directly
          if (
            values.some(
              c => c !== null && c !== undefined && String(c).trim() !== ''
            )
          ) {
            writeStream.write(processRowToCSV(values) + '\n')
            rowCount++
            if (onProgress && rowCount % 5000 === 0) onProgress(rowCount)
          }
        }
      }

      // End of rows. If headers still not found (file < 50 rows)
      if (!headersFound && rowBuffer.length > 0) {
        const { headerRowIndex: foundIndex, headers } = findHeaderRow(rowBuffer)
        headerRowIndex = foundIndex
        normalizedHeaders = normalizeHeaders(headers)
        colCount = normalizedHeaders.length

        const headerLine = normalizedHeaders
          .map(h => `"${String(h).replace(/"/g, '""')}"`)
          .join(',')
        writeStream.write(headerLine + '\n')

        for (let i = headerRowIndex + 1; i < rowBuffer.length; i++) {
          const buffRow = rowBuffer[i]
          if (
            buffRow.some(
              c => c !== null && c !== undefined && String(c).trim() !== ''
            )
          ) {
            writeStream.write(processRowToCSV(buffRow) + '\n')
            rowCount++
            if (onProgress && rowCount % 5000 === 0) onProgress(rowCount)
          }
        }
      }

      if (onProgress) onProgress(rowCount)

      writeStream.end()

      // Wait for finish
      await new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(null))
        writeStream.on('error', reject)
      })

      results.push({ sheetName, csvFilePath, rowCount })
    } catch (e: any) {
      console.error(`Error processing sheet ${sheetName}:`, e)
      results.push({
        sheetName,
        csvFilePath: '',
        rowCount: 0,
        error: e.message,
      })
    }
  }

  return { results, allSheetsCount: sheetCount }
}

/**
 * Process Excel buffer using exceljs
 */
export async function processExcelBufferExcelJS(
  fileBuffer: Buffer,
  targetSheetName?: string,
  targetTableName?: string
): Promise<{ results: ExcelProcessResult[]; allSheetsCount: number }> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(fileBuffer as any)

  const results: ExcelProcessResult[] = []

  // Filter sheets
  let sheetsToProcess: ExcelJS.Worksheet[] = []

  if (targetSheetName) {
    const sheet = workbook.getWorksheet(targetSheetName)
    if (sheet) sheetsToProcess.push(sheet)
  } else if (targetTableName && !targetSheetName) {
    // Legacy: first sheet
    const firstSheet = workbook.worksheets[0]
    if (firstSheet) sheetsToProcess.push(firstSheet)
  } else {
    sheetsToProcess = workbook.worksheets
  }

  for (const worksheet of sheetsToProcess) {
    try {
      // 1. Extract data matrix from worksheet
      // ExcelJS rows are 1-based
      const data: any[][] = []

      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        // exceljs row.values is [undefined, val1, val2, ...] because of 1-based indexing
        // We slice(1) to get 0-based array
        // However, row.values might be an object if columns are defined, but here we load from buffer so it should be array-like
        // A safer way is to iterate cells

        const rowData: any[] = []
        // Determine row span. row.cellCount isn't always reliable for sparse rows?
        // Use worksheet.columnCount or similar?
        // Let's just use the cell values.

        // Note: row.values exists but has the 1-based quirk.
        if (Array.isArray(row.values)) {
          // row.values[0] is undefined/empty.
          // We need to handle sparse arrays carefully.
          // Mapping row.values to a clean array
          const values = row.values as any[]
          // ExcelJS values array length = max column index + 1
          for (let i = 1; i < values.length; i++) {
            rowData[i - 1] = values[i]
          }
        } else if (typeof row.values === 'object') {
          // Should not happen for basic load, but handle just in case
          // row.values might be {1: 'a', 2: 'b'}
          // ...
          // Let's stick to iterating cells if unsure, but row.values is faster
          const values = row.values as any
          // Find max key?
          // Simplest: iterate columns
          worksheet.columns?.forEach((col, idx) => {
            // ... this is complex without knowing headers.
          })
        }

        // Handling Merged Cells:
        // ExcelJS returns the value for the master cell.
        // For other cells in the merge, value is null/undefined usually.
        // But the cell object has .master.
        // We need to fill the value if it's merged.

        const filledRowData: any[] = []
        const maxCol = worksheet.columnCount // or calculate from row

        // Actually, let's iterate up to the last cell index of this row
        const cellCount = row.cellCount
        // But row.cellCount only counts non-empty?
        // row.actualCellCount ?

        // Better approach: Iterate from 1 to row.cellCount (or explicit bounds)
        // But wait, row.getCell(i) is robust.

        // Performance Warning: getCell might be slow if called millions of times.
        // Let's try to trust row.values first, and handle merges separately?
        // Or just use getCell which handles merges automatically?
        // "When a cell is part of a merge, its value is shared..." - Wait, checking docs.
        // ExcelJS: "Master cell has the value. Other cells share the value IF accessed via API?"
        // Checking: cell.value might be the value or null. cell.master is the master cell.

        for (let colNumber = 1; colNumber <= row.cellCount; colNumber++) {
          // This might skip trailing empty cells
          // We want consistent columns.
          // We'll normalize length later (padding).

          const cell = row.getCell(colNumber)

          // Handle Merge: if cell is merged but not master, use master's value
          let val = cell.value
          if (cell.isMerged && cell.master && cell !== cell.master) {
            val = cell.master.value
          }

          // Handle Rich Text / Hyperlinks / Formula
          if (val && typeof val === 'object' && !(val instanceof Date)) {
            if ('richText' in val && Array.isArray((val as any).richText)) {
              val = (val as any).richText.map((t: any) => t.text).join('')
            } else if ('text' in val && 'hyperlink' in val) {
              val = (val as any).text
            } else if ('result' in val) {
              // Formula result
              val = (val as any).result
              // If result is also an object (e.g. error), handle it
              if (val && typeof val === 'object' && !(val instanceof Date)) {
                if ('error' in val) val = (val as any).error
                else val = JSON.stringify(val)
              }
            } else {
              // Fallback for unknown objects to prevent [object Object]
              try {
                val = JSON.stringify(val)
              } catch {
                val = String(val)
              }
            }
          }

          // 0-based index
          filledRowData[colNumber - 1] = val
        }

        data.push(filledRowData)
      })

      if (data.length === 0) continue

      // Reuse finding headers logic
      const { headerRowIndex, headers } = findHeaderRow(data)
      const normalizedHeaders = normalizeHeaders(headers)
      const colCount = normalizedHeaders.length

      // Filter empty rows
      const dataRows = data.slice(headerRowIndex + 1).filter(row => {
        return (
          row &&
          row.some(
            cell =>
              cell !== null && cell !== undefined && String(cell).trim() !== ''
          )
        )
      })

      const csvLines = dataRows.map(row => {
        const rowData: string[] = []
        for (let i = 0; i < colCount; i++) {
          const cell = row[i]
          let strCell = ''

          if (cell === null || cell === undefined) {
            strCell = ''
          } else if (cell instanceof Date && !isNaN(cell.getTime())) {
            // 1. Fix Excel floating point date precision issues (e.g. 23:59:59.999)
            // Round to nearest second to stabilize
            const time = cell.getTime()
            const roundedTime = Math.round(time / 1000) * 1000
            const roundedDate = new Date(roundedTime)

            // 2. Use UTC methods to extract "Wall Time" components
            // ExcelJS parses dates as UTC timestamps. e.g. "2023-01-01" -> UTC 00:00:00.
            // We must use UTC getters to retrieve the original literal values.
            const year = roundedDate.getUTCFullYear()
            const month = String(roundedDate.getUTCMonth() + 1).padStart(2, '0')
            const day = String(roundedDate.getUTCDate()).padStart(2, '0')
            const hours = roundedDate.getUTCHours()
            const minutes = roundedDate.getUTCMinutes()
            const seconds = roundedDate.getUTCSeconds()
            const ms = roundedDate.getUTCMilliseconds()

            // 3. Smart Formatting for DuckDB Inference
            if (hours === 0 && minutes === 0 && seconds === 0) {
              // Pure Date -> YYYY-MM-DD
              strCell = `${year}-${month}-${day}`
            } else {
              // Timestamp -> YYYY-MM-DDTHH:mm:ss.sss (Local/Naive ISO)
              const h = String(hours).padStart(2, '0')
              const min = String(minutes).padStart(2, '0')
              const s = String(seconds).padStart(2, '0')
              // Use .000 for milliseconds since we rounded to seconds
              strCell = `${year}-${month}-${day}T${h}:${min}:${s}.000`
            }
          } else {
            strCell = String(cell)
          }

          // CSV Escape
          rowData.push(`"${strCell.replace(/"/g, '""')}"`)
        }
        return rowData.join(',')
      })

      const headerLine = normalizedHeaders
        .map(h => `"${String(h).replace(/"/g, '""')}"`)
        .join(',')

      const csvData = [headerLine, ...csvLines].join('\n')

      results.push({ sheetName: worksheet.name, csvData })
    } catch (e: any) {
      results.push({ sheetName: worksheet.name, csvData: '', error: e.message })
    }
  }

  return { results, allSheetsCount: workbook.worksheets.length }
}
