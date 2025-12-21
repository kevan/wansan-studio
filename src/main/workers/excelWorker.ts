import { parentPort, workerData } from 'worker_threads'
import { processExcelBuffer } from './excelUtils'

interface WorkerData {
  fileBuffer: Buffer
  targetSheetName?: string
  targetTableName?: string
}

try {
  const { fileBuffer, targetSheetName, targetTableName } =
    workerData as WorkerData

  const { results, allSheetsCount } = processExcelBuffer(
    fileBuffer,
    targetSheetName,
    targetTableName
  )

  parentPort?.postMessage({
    success: true,
    data: results,
    allSheetsCount,
  })
} catch (error: any) {
  parentPort?.postMessage({ success: false, error: error.message })
}
