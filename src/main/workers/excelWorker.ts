import { 
  processExcelFileStreaming,
  processExcelBufferExcelJS,
} from './exceljsUtils'
import fs from 'fs-extra'
import path from 'path'

interface WorkerMessage {
  filePath: string
  outputDir: string
  targetSheetName?: string
  targetTableName?: string
}

process.on('message', async (message: WorkerMessage) => {
  const { filePath, outputDir, targetSheetName, targetTableName } = message

  try {
    // 1. Pre-check file status and signature
    const stats = await fs.stat(filePath)
    if (stats.size === 0) {
      throw new Error('The file is empty.')
    }

    const fileBuffer = await fs.readFile(filePath)
    const isZip = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b
    const headerSample = fileBuffer.slice(0, 100).toString('utf8')
    const isHtml = /<html|<table|<xml/i.test(headerSample)
    const isOldXls = fileBuffer[0] === 0xd0 && fileBuffer[1] === 0xcf

    if (!isZip) {
      if (isHtml) {
        throw new Error(
          'This file appears to be an HTML/XML export rather than a standard Excel file. Please open it in Excel and "Save As" a real XLSX file.'
        )
      }
      if (isOldXls) {
        throw new Error(
          'Old Excel format (.xls) detected. Only modern .xlsx files are supported. Please open it in Excel and "Save As" .xlsx.'
        )
      }
      throw new Error(
        'Invalid Excel file signature. The file might be a CSV or HTML export renamed to .xlsx. Please open it in Excel and "Save As" a real XLSX file.'
      )
    }

    // 2. Attempt streaming parse (Memory Efficient)
    try {
      console.log(`[ExcelWorker] Attempting streaming parse: ${filePath}`)
      const { results, allSheetsCount } = await processExcelFileStreaming(
        filePath,
        outputDir,
        targetSheetName,
        targetTableName,
        rowCount => {
          if (process.send) {
            process.send({ type: 'progress', rowCount })
          }
        }
      )

      if (process.send) {
        process.send({ success: true, data: results, allSheetsCount })
      }
    } catch (streamError: any) {
      console.warn(
        `[ExcelWorker] Streaming parse failed, falling back to Buffer mode:`,
        streamError.message
      )

      // 3. Fallback to full buffer parse (More compatible for some edge cases)
      const { results, allSheetsCount } = await processExcelBufferExcelJS(
        fileBuffer,
        targetSheetName,
        targetTableName,
        (progress, isIntermediate) => {
          if (process.send) {
            // For buffer mode, we can't give row counts easily for the load part.
            // We'll send a "percentage" instead.
            // 50% for load, then 50-100% for row iteration.
            const finalProgress = isIntermediate
              ? 50
              : 50 + Math.floor(progress * 0.5)
            process.send({
              type: 'progress',
              isPercentage: true,
              progress: finalProgress,
            })
          }
        }
      )

      const processedResults = []
      for (const res of results) {
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
        process.send({
          success: true,
          data: processedResults,
          allSheetsCount,
        })
      }
    }
  } catch (err: any) {
    console.error(`[ExcelWorker] Parse failed:`, err.message)
    if (process.send) {
      process.send({ success: false, error: err.message })
    }
  } finally {
    process.exit(0)
  }
})