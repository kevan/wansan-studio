import { DBConnectionConfig } from '@shared/types'
import { NativeDatabaseService } from './native-db-service'
import { secureGet } from './secure-storage'
import { normalizeDuckDBType } from '@shared/type-utils'
import path from 'path'
import fs from 'fs-extra'
import { app } from 'electron'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'

export interface DBTableInfo {
  name: string
  schema?: string
}

/**
 * 高性能 CSV 格式化器，支持流式处理
 * 确保大数据量下内存占用极低，且正确处理 CSV 转义
 */
class CSVFormatter extends Transform {
  private isFirstChunk = true
  constructor(private columns: string[]) {
    super({ objectMode: true })
  }

  _transform(row: any, _encoding: any, callback: any) {
    let result = ''
    if (this.isFirstChunk) {
      // 写入 CSV 表头
      result += this.columns.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\n'
      this.isFirstChunk = false
    }

    // 写入行数据
    result += this.columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      if (val instanceof Date) return val.toISOString()
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
      
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',') + '\n'

    callback(null, result)
  }
}

export class DBConnectorService {
  constructor(private databaseService: NativeDatabaseService) {}

  /**
   * 测试数据库连接
   */
  async testConnection(config: DBConnectionConfig, passwordOverride?: string): Promise<boolean> {
    const password = passwordOverride || secureGet(`db_pass_${config.id}`) || ''
    
    if (config.type === 'postgres') {
      const { Client } = await import('pg')
      const client = new Client({
        host: config.host,
        port: config.port,
        user: config.user,
        password: password,
        database: config.database,
        connectionTimeoutMillis: 5000,
      })
      try {
        await client.connect()
        await client.end()
        return true
      } catch (e) {
        console.error('[Connector] PG Connection failed:', e)
        throw e
      }
    } else {
      const mysql = await import('mysql2/promise')
      try {
        const connection = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: password,
          database: config.database,
          connectTimeout: 5000,
          charset: 'UTF8MB4',
        })
        await connection.query("SET NAMES 'utf8mb4'")
        await connection.end()
        return true
      } catch (e) {
        console.error('[Connector] MySQL Connection failed:', e)
        throw e
      }
    }
  }

  /**
   * 获取所有数据表
   */
  async listTables(config: DBConnectionConfig): Promise<DBTableInfo[]> {
    const password = secureGet(`db_pass_${config.id}`) || ''
    
    if (config.type === 'postgres') {
      const { Client } = await import('pg')
      const client = new Client({ host: config.host, port: config.port, user: config.user, password, database: config.database })
      await client.connect()
      const res = await client.query(`
        SELECT table_name as name, table_schema as schema 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_name
      `)
      await client.end()
      return res.rows
    } else {
      const mysql = await import('mysql2/promise')
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: password,
        database: config.database,
        charset: 'UTF8MB4',
      })
      await connection.query("SET NAMES 'utf8mb4'")
      const [rows] = await connection.execute('SHOW TABLES')
      await connection.end()
      return (rows as any[]).map(row => ({
        name: Object.values(row)[0] as string
      }))
    }
  }

  /**
   * 获取表结构和预览数据
   */
  async previewTable(config: DBConnectionConfig, tableName: string) {
    const password = secureGet(`db_pass_${config.id}`) || ''
    
    if (config.type === 'postgres') {
      const { Client } = await import('pg')
      const client = new Client({ host: config.host, port: config.port, user: config.user, password, database: config.database })
      await client.connect()
      
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName])
      
      const dataRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 100`)
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`) 
      
      await client.end()
      
      return {
        columns: colRes.rows.map(r => ({
          name: r.column_name,
          type: normalizeDuckDBType(r.data_type),
          nullable: r.is_nullable === 'YES'
        })),
        preview: dataRes.rows,
        rowCount: parseInt(countRes.rows[0].count)
      }
    } else {
      const mysql = await import('mysql2/promise')
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password,
        database: config.database,
        charset: 'UTF8MB4',
        decimalNumbers: true
      })
      
      await conn.query("SET NAMES 'utf8mb4'")
      
      const [cols] = await conn.execute(`DESCRIBE 
${tableName}
`)
      const [data] = await conn.execute(`SELECT * FROM 
${tableName}
 LIMIT 100`)
      const [count] = await conn.execute(`SELECT COUNT(*) as count FROM 
${tableName}
`)
      
      await conn.end()
      
      return {
        columns: (cols as any[]).map(r => ({
          name: r.Field,
          type: normalizeDuckDBType(r.Type),
          nullable: r.Null === 'YES'
        })),
        preview: data as any[],
        rowCount: (count as any[])[0].count
      }
    }
  }

  /**
   * Sync table data to local DuckDB (Snapshot Mode)
   * Using Streaming to support massive datasets.
   * v1.6.2: Stops at CSV generation to align with Excel workflow.
   */
  async syncTable(config: DBConnectionConfig, tableName: string, localTableName: string) {
    const preview = await this.previewTable(config, tableName)
    const columnNames = preview.columns.map(c => c.name)
    
    // 1. Prepare Temp CSV File
    const tempFileName = `db_cache_${Date.now()}.csv`
    const tempPath = path.join(app.getPath('temp'), tempFileName)
    const writeStream = fs.createWriteStream(tempPath)
    
    console.log(`[Connector] Streaming sync to disk: ${tableName} -> ${tempPath}`)

    try {
      if (config.type === 'postgres') {
          const { Client } = await import('pg')
          const QueryStream = (await import('pg-query-stream')).default
          const client = new Client({ 
            host: config.host, 
            port: config.port, 
            user: config.user, 
            password: secureGet(`db_pass_${config.id}`) || '', 
            database: config.database 
          })
          await client.connect()
          const query = new QueryStream(`SELECT * FROM "${tableName}"`)
          const stream = client.query(query)
          
          await pipeline(stream, new CSVFormatter(columnNames), writeStream)
          await client.end()
      } else {
          const mysql = await import('mysql2')
          const conn = mysql.createConnection({ 
            host: config.host, 
            port: config.port, 
            user: config.user, 
            password: secureGet(`db_pass_${config.id}`) || '', 
            database: config.database, 
            charset: 'UTF8MB4',
            decimalNumbers: true
          })
          
          await new Promise((resolve, reject) => {
            conn.query("SET NAMES 'utf8mb4'", (err) => err ? reject(err) : resolve(true))
          })
          
          const stream = conn.query(`SELECT * FROM \`${tableName}\``).stream()
          
          await pipeline(stream, new CSVFormatter(columnNames), writeStream)
          conn.end()
      }

      console.log(`[Connector] CSV generation complete: ${tempPath}`)

      return { 
        success: true, 
        rowCount: preview.rowCount, 
        columns: preview.columns,
        preview: preview.preview,
        tempFilePath: tempPath // [IMPORTANT] Return path instead of table name
      }
    } catch (error) {
      console.error('[Connector] Streaming sync failed:', error)
      // Cleanup on failure
      await fs.unlink(tempPath).catch(() => {})
      throw error
    }
  }
}
