import { parentPort, workerData } from 'worker_threads'
import { processExcelFileStreaming } from './exceljsUtils'

interface WorkerData {
  filePath: string
  outputDir: string
  targetSheetName?: string
  targetTableName?: string
}

async function run() {
  try {
    const { filePath, outputDir, targetSheetName, targetTableName } =
      workerData as WorkerData

    const { results, allSheetsCount } = await processExcelFileStreaming(
      filePath,
      outputDir,
      targetSheetName,
      targetTableName,
      (rowCount) => {
        parentPort?.postMessage({
          type: 'progress',
          rowCount
        })
      }
    )

    parentPort?.postMessage({
      success: true,
      data: results,
      allSheetsCount,
    })
  } catch (error: any) {
    parentPort?.postMessage({ success: false, error: error.message })
  }
}

run()
