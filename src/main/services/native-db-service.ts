import { dbClient } from './db-service/client'
import { formatForDisplay } from '../../shared/serialization'

export class NativeDatabaseService {
  constructor() {}

  async initialize(dbPath?: string): Promise<void> {
    console.log('[NativeDB] Initializing service adapter...')
    await dbClient.init()
    await dbClient.connect(dbPath)
    console.log(
      `[NativeDB] Service adapter initialized. Path: ${dbPath || ':memory:'}`
    )
  }

  async query(sql: string): Promise<any[]> {
    console.log('[NativeDB] Query:', sql)
    return dbClient.executeQuery(sql)
  }



  async queryWithSchema(sql: string): Promise<{
    data: any[]
    columnFields: Array<{ name: string; type: string }>
  }> {
    console.log('[NativeDB] QueryWithSchema:', sql)
    const res = await dbClient.executeQueryFull(sql)
    
    const data = res.data || []
    const columnFields = res.meta?.columnFields || []

    // Post-process: Format Date/Time columns to strings to prevent them being shown as raw timestamps
    // We do NOT format numeric columns here to preserve them for chart rendering
    if (data.length > 0 && columnFields.length > 0) {
      const dateColumns = columnFields.filter(col => {
        const type = col.type.toUpperCase()
        return type.includes('DATE') || type.includes('TIMESTAMP')
      })

      if (dateColumns.length > 0) {
        for (const row of data) {
          for (const col of dateColumns) {
            if (row[col.name] !== null && row[col.name] !== undefined) {
              row[col.name] = formatForDisplay(row[col.name], col.type)
            }
          }
        }
      }
    }

    return {
      data,
      columnFields,
    }
  }

  async exec(sql: string): Promise<void> {
    console.log('[NativeDB] Exec:', sql)
    await dbClient.executeQuery(sql)
  }

  async getSchema(tableName?: string): Promise<any> {
    return dbClient.getSchema(tableName)
  }

  async checkpoint(): Promise<void> {
    await dbClient.checkpoint()
  }

  async dropAllTables(): Promise<void> {
    // Get all tables first
    const schema = await this.getSchema()
    const tables = schema.tables || []

    for (const t of tables) {
      await dbClient.deleteTable(t.tableName)
    }
  }

  async close(): Promise<void> {
    await dbClient.stop()
  }
}
