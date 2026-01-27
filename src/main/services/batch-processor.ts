import { NativeDatabaseService } from './native-db-service'
import { AIService } from './ai-service'
import { FileService } from './file'
import { BrowserWindow } from 'electron'

export interface BatchJobParams {
  tableName: string
  columnName: string
  targetColumnName: string
  prompt: string
  projectPath: string | null
  window?: BrowserWindow
}

interface TableInfo {
  column_name: string
  column_type: string
  null: string
  key: string
  default: any
  extra: any
}

export class BatchProcessor {
  constructor(
    private db: NativeDatabaseService,
    private ai: AIService,
    private fileService: FileService
  ) {}

  async runExtraction(params: BatchJobParams) {
    const { tableName, columnName, targetColumnName, prompt, projectPath, window } = params
    const sidecarName = `${tableName}_ext_ai`
    const batchSize = 20 // Smaller batches for better interactivity

    try {
      // 1. Ensure Sidecar Table exists
      await this.db.exec(`CREATE TABLE IF NOT EXISTS "${sidecarName}" (_ws_row_id BIGINT PRIMARY KEY)`)

      // 2. Add Target Column to Sidecar if not exists
      const cols = await this.db.query(`PRAGMA table_info('${sidecarName}')`) as TableInfo[]
      if (!cols.some(c => c.column_name === targetColumnName)) {
        await this.db.exec(`ALTER TABLE "${sidecarName}" ADD COLUMN "${targetColumnName}" TEXT`)
      }

      // 3. Get total count of rows needing processing
      const countRes = await this.db.query(`
        SELECT COUNT(*) as count 
        FROM "${tableName}" t1
        LEFT JOIN "${sidecarName}" t2 ON t1._ws_row_id = t2._ws_row_id
        WHERE t2."${targetColumnName}" IS NULL
      `) as { count: number | bigint }[]

      const total = Number(countRes[0].count)
      let processed = 0

      console.log(`[BatchProcessor] Starting job: ${total} rows to process for ${tableName}.${columnName}`)

      // 4. Batch Loop
      while (processed < total) {
        // Fetch next chunk
        const rows = await this.db.query(`
          SELECT t1._ws_row_id, t1."${columnName}" as val
          FROM "${tableName}" t1
          LEFT JOIN "${sidecarName}" t2 ON t1._ws_row_id = t2._ws_row_id
          WHERE t2."${targetColumnName}" IS NULL
          LIMIT ${batchSize}
        `) as { _ws_row_id: number | bigint, val: any }[]

        if (rows.length === 0) break

        const ids = rows.map(r => r._ws_row_id)
        const vals = rows.map(r => r.val)

        // Call AI
        const aiRes = await this.ai.previewExtraction(vals, prompt, projectPath)

        // Write results to sidecar
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]
          const result = aiRes.results[i] ?? null

          // Use UPSERT logic
          await this.db.exec(`
            INSERT INTO "${sidecarName}" (_ws_row_id, "${targetColumnName}") 
            VALUES (${id}, ${result === null ? 'NULL' : `'${String(result).replace(/'/g, "''")}'`})
            ON CONFLICT(_ws_row_id) DO UPDATE SET "${targetColumnName}" = EXCLUDED."${targetColumnName}"
          `)
        }

        processed += rows.length

        // Send Progress to UI
        if (window) {
          window.webContents.send('ai:batch-progress', {
            tableName,
            columnName,
            targetColumnName,
            total,
            processed,
            percentage: Math.round((processed / total) * 100)
          })
        }
      }

      console.log(`[BatchProcessor] Job completed for ${tableName}`)

    } catch (error) {
      console.error(`[BatchProcessor] Job failed`, error)
      throw error
    }
  }
}
