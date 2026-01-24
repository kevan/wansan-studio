import {
  processExcelFileStreaming,
  processExcelBufferExcelJS,
} from './exceljsUtils'
import fs from 'fs-extra'
import path from 'path'
import ExcelJS from 'exceljs'

interface WorkerMessage {
  type: 'inspect' | 'convert'
  filePath: string
  outputDir: string
  targetSheetName?: string
  targetTableName?: string
}

process.on('message', async (message: WorkerMessage) => {
  const { type = 'convert', filePath, outputDir, targetSheetName, targetTableName } = message
  const onlyHeaders = type === 'inspect'

  try {
    const stats = await fs.stat(filePath)
    if (stats.size === 0) throw new Error('The file is empty.')

    const fileBuffer = await fs.readFile(filePath)
    const isZip = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b
    
    // 1. Unified Path: Try Streaming (XLSX)
    if (isZip) {
      try {
        const { results, allSheetsCount } = await processExcelFileStreaming(
          filePath,
          outputDir,
          targetSheetName,
          targetTableName,
          rowCount => {
            if (process.send && !onlyHeaders) process.send({ type: 'progress', rowCount })
          },
          onlyHeaders
        )

        if (process.send) {
          if (onlyHeaders) {
            const inspectData = results.map(r => ({ sourceName: r.sheetName, previewHeaders: r.headers || [] }))
            process.send({ success: true, data: inspectData })
          } else {
            process.send({ success: true, data: results, allSheetsCount })
          }
        }
        return
      } catch (streamError: any) {
        // Only warn if we are going to try buffer fallback
        console.warn(`[ExcelWorker] Streaming failed, attempting Buffer fallback. Reason:`, streamError.message)
      }
    }

    // 2. Fallback Path: Buffer (XLS or Corrupt XLSX)
    // [FIX] In inspect mode, we must NOT suppress errors here. 
    // If streaming failed AND buffer fails, the file is unreadable.
    if (onlyHeaders) {
      const workbook = new ExcelJS.Workbook()
      // If this throws, we let it bubble up to the main catch block
      await workbook.xlsx.load(fileBuffer as any) 
      
      const sheets = workbook.worksheets.map(ws => {
        const firstRow = ws.getRow(1)
        const headers = Array.isArray(firstRow.values) 
          ? (firstRow.values as any[]).slice(1).map(v => v === null ? '' : String(v))
          : []
        return { sourceName: ws.name, previewHeaders: headers }
      })

      if (process.send) process.send({ success: true, data: sheets })
      return
    }

    const { results, allSheetsCount } = await processExcelBufferExcelJS(
      fileBuffer,
      targetSheetName,
      targetTableName,
      (progress, isIntermediate) => {
        if (process.send && !onlyHeaders) {
          const finalProgress = isIntermediate ? 50 : 50 + Math.floor(progress * 0.5)
          process.send({ type: 'progress', isPercentage: true, progress: finalProgress })
        }
      },
      onlyHeaders
    )

    if (onlyHeaders) {
      const inspectData = results.map(r => ({ sourceName: r.sheetName, previewHeaders: r.headers || [] }))
      if (process.send) process.send({ success: true, data: inspectData })
      return
    }

    // Process convert results
    const processedResults = []
    for (const res of results) {
      if (res.error) continue
      const tempCsvName = `temp_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.csv`
      const csvFilePath = path.join(outputDir, tempCsvName)
      await fs.writeFile(csvFilePath, res.csvData)
      processedResults.push({
        sheetName: res.sheetName,
        csvFilePath: csvFilePath,
        rowCount: res.csvData.split('\n').length - 1,
      })
    }

    if (process.send) {
      process.send({ success: true, data: processedResults, allSheetsCount })
    }
  } catch (err: any) {
    if (process.send) {
        // [FIX] Send stack trace
        process.send({ success: false, error: err.message, stack: err.stack })
    }
  } finally {
    process.exit(0)
  }
})
