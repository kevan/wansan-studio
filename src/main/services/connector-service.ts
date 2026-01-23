import { DBConnectionConfig } from '@shared/types'
import { NativeDatabaseService } from './native-db-service'
import { secureGet } from './secure-storage'
import { normalizeDuckDBType } from '@shared/type-utils'

export interface DBTableInfo {
  name: string
  schema?: string
}

export class DBConnectorService {
  constructor(private databaseService: NativeDatabaseService) {}

  /**
   * Test connection to a database
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
        })
        await connection.end()
        return true
      } catch (e) {
        console.error('[Connector] MySQL Connection failed:', e)
        throw e
      }
    }
  }

  /**
   * List all tables in the database
   */
  async listTables(config: DBConnectionConfig): Promise<DBTableInfo[]> {
    const password = secureGet(`db_pass_${config.id}`) || ''
    
    if (config.type === 'postgres') {
      const { Client } = await import('pg')
      const client = new Client({
        host: config.host,
        port: config.port,
        user: config.user,
        password: password,
        database: config.database,
      })
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
      })
      const [rows] = await connection.execute('SHOW TABLES')
      await connection.end()
      // MySQL returns objects like { "Tables_in_dbname": "tablename" }
      return (rows as any[]).map(row => ({
        name: Object.values(row)[0] as string
      }))
    }
  }

  /**
   * Fetch table schema and sample data for preview
   */
  async previewTable(config: DBConnectionConfig, tableName: string) {
    const password = secureGet(`db_pass_${config.id}`) || ''
    
    if (config.type === 'postgres') {
      const { Client } = await import('pg')
      const client = new Client({ host: config.host, port: config.port, user: config.user, password, database: config.database })
      await client.connect()
      
      // 1. Get Columns
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName])
      
      // 2. Get Sample (Top 100)
      const dataRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 100`)
      
      // 3. Get Row Count
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
      const conn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password, database: config.database })
      
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
   * v1.6 Implementation: Simple Fetch All and Batch Insert.
   */
  async syncTable(config: DBConnectionConfig, tableName: string, localTableName: string) {
    const password = secureGet(`db_pass_${config.id}`) || ''
    const preview = await this.previewTable(config, tableName)
    
    // 1. Create Local Table
    const colDefs = preview.columns.map(c => `"${c.name}" ${c.type}`).join(', ')
    await this.databaseService.exec(`DROP TABLE IF EXISTS "${localTableName}" `)
    await this.databaseService.exec(`CREATE TABLE "${localTableName}" (${colDefs})`)
    
    // 2. Stream and Insert
    // For v1.6 MVP, we'll do a simple bulk fetch if row count is reasonable (< 1M)
    // Future: Use real streams for very large tables
    if (config.type === 'postgres') {
        const { Client } = await import('pg')
        const client = new Client({ host: config.host, port: config.port, user: config.user, password, database: config.database })
        await client.connect()
        
        // Use DuckDB Appender for fast batch insertion
        // Note: For simplicity in first pass, we use JSON ingestion logic
        const res = await client.query(`SELECT * FROM "${tableName}" `)
        await client.end()
        
        // Ingest into DuckDB
        // We'll use a temporary CSV or JSON strategy similar to FileService
        // But for now, we'll use our existing ingestJsonData logic
        const { ingestJsonData } = await import('../engine/ingestion')
        await ingestJsonData(this.databaseService, localTableName, res.rows)
    } else {
        const mysql = await import('mysql2/promise')
        const conn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password, database: config.database })
        const [rows] = await conn.execute(`SELECT * FROM 
${tableName}
`)
        await conn.end()
        
        const { ingestJsonData } = await import('../engine/ingestion')
        await ingestJsonData(this.databaseService, localTableName, rows as any[])
    }
    
    return { success: true, rowCount: preview.rowCount, columns: preview.columns }
  }
}
