import { createRequire } from 'module'
import path from 'path'
import { Mutex } from 'async-mutex'
import { app } from 'electron'

// Use blocking DuckDB version to avoid worker issues
const require = createRequire(import.meta.url)
const duckdb = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs')

// Helper to sanitize values for IPC (handle BigInt, etc.)
function sanitizeValue(value: any): any {
  if (typeof value === 'bigint') {
    // Convert BigInt to number for IPC safety
    // Note: This might lose precision for very large integers (> 2^53)
    return Number(value)
  }
  if (value instanceof Date) {
    return value.getTime() // Convert Date to timestamp for consistency
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (value !== null && typeof value === 'object') {
    const plain: any = {}
    for (const key of Object.keys(value)) {
      plain[key] = sanitizeValue(value[key])
    }
    return plain
  }
  return value
}

export class DatabaseService {
  private db: any = null
  private conn: any = null
  private mutex: Mutex = new Mutex()
  private isReady = false

  private async ensureInitialized(): Promise<void> {
    if (this.isReady) return

    console.log('Initializing DuckDB-WASM (Blocking)...')
    try {
      // Resolve the path to the WASM bundle
      let DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm'))
      
      // [FIX] If packaged, point to the unpacked directory (physical path)
      // This is crucial for WASM loading to work correctly with asarUnpack
      if (app.isPackaged) {
        DUCKDB_DIST = DUCKDB_DIST.replace('app.asar', 'app.asar.unpacked')
      }
      
      console.log('DUCKDB_DIST:', DUCKDB_DIST)

      // Bundle paths - Node.js uses generic wasm files, not node-specific ones
      const bundles = {
        mvp: {
          mainModule: path.resolve(DUCKDB_DIST, './duckdb-mvp.wasm'),
          mainWorker: path.resolve(DUCKDB_DIST, './duckdb-node-mvp.worker.cjs'),
        },
        eh: {
          mainModule: path.resolve(DUCKDB_DIST, './duckdb-eh.wasm'),
          mainWorker: path.resolve(DUCKDB_DIST, './duckdb-node-eh.worker.cjs'),
        },
      }
      console.log('Using bundles:', bundles)

      const logger = new duckdb.ConsoleLogger()

      console.log('Creating DuckDB (Blocking)...')
      // Use the factory function createDuckDB from blocking API
      this.db = await duckdb.createDuckDB(
        bundles,
        logger,
        duckdb.NODE_RUNTIME
      )
      console.log('Created successfully')

      // Instantiate the bindings
      console.log('Instantiating...')
      await this.db.instantiate()
      console.log('Instantiated successfully')

      console.log('Connecting to DuckDB...')
      this.conn = this.db.connect()
      console.log('Connected successfully')
      this.isReady = true

      await this.query("SET memory_limit='2GB'")
      // Note: SET threads is not supported in blocking version (no threads)
      // await this.query('SET threads=4')

      console.log('DuckDB-WASM (Blocking) initialized successfully')
    } catch (error) {
      console.error('Failed to initialize DuckDB-WASM (Blocking):', error)
      throw error
    }
  }

  async initialize(): Promise<void> {
    return this.ensureInitialized()
  }

  async query(sql: string): Promise<any[]> {
    return this.mutex.runExclusive(async () => {
      await this.ensureInitialized()
      if (!this.conn) {
        throw new Error('Database not initialized')
      }

      try {
        const arrowTable = this.conn.query(sql)
        // Convert Arrow table to JSON and sanitize for IPC
        return arrowTable.toArray().map((row: any) => sanitizeValue(row.toJSON()))
      } catch (error) {
        console.error('Query failed:', sql, error)
        throw error
      }
    })
  }

  async exec(sql: string): Promise<void> {
    await this.query(sql)
  }

  async getSchema(tableName?: string): Promise<any> {
    try {
      if (!tableName) {
        const tablesResult = await this.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'"
        )

        if (!tablesResult || tablesResult.length === 0) {
          return { tables: [] }
        }

        const tablesWithDetails = await Promise.all(
          tablesResult.map(async (row: any) => {
            const tableName = row.table_name
            try {
              const columns = await this.query(`
                  SELECT column_name as name, data_type as type, is_nullable as nullable
                  FROM information_schema.columns
                  WHERE table_name = '${tableName}'
                  ORDER BY ordinal_position
              `)

              return {
                tableName,
                description: '',
                columns: columns || [],
              }
            } catch (error) {
              console.error(`Failed to get schema for table ${tableName}:`, error)
              return {
                tableName,
                description: 'Error fetching schema',
                columns: [],
              }
            }
          })
        )

        return { tables: tablesWithDetails }
      }

      const columns = await this.query(`
          SELECT column_name as name, data_type as type, is_nullable as nullable
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
      `)

      return {
        tableName,
        columns,
      }
    } catch (error) {
      console.error('getSchema error:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      if (this.conn) {
        this.conn.close()
        this.conn = null
      }

      if (this.db) {
        await this.db.terminate()
        this.db = null
      }

      this.isReady = false
      console.log('DuckDB-WASM (Blocking) connection closed')
    })
  }

  async registerFileText(filename: string, data: string): Promise<void> {
    await this.ensureInitialized()
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    this.db.registerFileText(filename, data)
  }

  getDb(): any {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  getConn(): any {
    if (!this.conn) {
      throw new Error('Database connection not initialized')
    }
    return this.conn
  }
}
