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

    try {
      // FALLBACK: Load entire file into buffer and use standard reader
      const fileBuffer = await fs.readFile(filePath)
      const { results, allSheetsCount } = await processExcelBufferExcelJS(
        fileBuffer,
        targetSheetName,
        targetTableName
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
    } catch (bufferError: any) {
      console.error(
        `[ExcelWorker] All parse methods failed:`,
        bufferError.message
      )
      if (process.send) {
        process.send({ success: false, error: bufferError.message })
      }
    }
  } finally {
    process.exit(0)
  }
})
