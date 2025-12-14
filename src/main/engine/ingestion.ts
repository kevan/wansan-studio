import { app } from 'electron'
import * as path from 'path'
import { Worker } from 'worker_threads'
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
  // Resolve worker path
  let workerPath: string
  if (app.isPackaged) {
    // In production, app.asar is where the code lives. 
    // We assume the worker file is bundled and present in dist.
    workerPath = path.join(process.resourcesPath, 'app.asar/dist/main/workers/excelWorker.cjs')
  } else {
    // In development
    workerPath = path.join(app.getAppPath(), 'dist/main/workers/excelWorker.cjs')
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { fileBuffer, targetSheetName, targetTableName }
    })

    worker.on('message', async (message) => {
      if (message.success) {
        const results: TableSchema[] = []
        const { data, allSheetsCount } = message
        
        try {
            for (const { sheetName, csvData, error } of data) {
                if (error) {
                    console.error(`Worker failed for sheet ${sheetName}:`, error)
                    continue
                }
                
                let tableName: string
                // Logic to determine table name
                if (targetTableName && data.length === 1) {
                   tableName = targetTableName
                   await databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)
                } else {
                   tableName = await getUniqueTableName(databaseService, fileName, sheetName)
                }

                const tempFileName = `${tableName}.csv`
                await databaseService.registerFileText(tempFileName, csvData)
                
                await databaseService.exec(
                    `CREATE TABLE "${tableName}" AS
                    SELECT *
                    FROM read_csv_auto('${tempFileName}', HEADER = TRUE, SAMPLE_SIZE = -1, auto_detect = true)`,
                )
                
                const columnsResult = await databaseService.query(`PRAGMA table_info('${tableName}');`)
                const columns: ColumnSchema[] = []
                for (const col of columnsResult) {
                     const sampleValues = await getSampleValues(databaseService, tableName, col.name, col.type)
                     columns.push({
                        name: col.name,
                        safeName: col.name,
                        type: col.type as ColumnType,
                        sampleValues,
                     })
                }

                results.push({
                    tableName,
                    description: allSheetsCount > 1 ? `${fileName} - ${sheetName}` : fileName,
                    columns,
                })
            }
            resolve(results)
        } catch (dbError) {
            reject(dbError)
        }
      } else {
        reject(new Error(message.error))
      }
    })

    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
    })
  })
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