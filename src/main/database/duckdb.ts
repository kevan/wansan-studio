import * as duckdb from '@duckdb/duckdb-wasm'
import { Worker } from 'worker_threads'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Mutex } from 'async-mutex'

export class DatabaseService {
  private db: duckdb.AsyncDuckDB | null = null
  private conn: duckdb.AsyncDuckDBConnection | null = null
  private mutex: Mutex = new Mutex()
  private isReady = false

  private async ensureInitialized(): Promise<void> {
    if (this.isReady) return

    console.log('Initializing DuckDB-WASM...')
    try {
      const require = createRequire(import.meta.url)
      const DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm'))


      const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
          mainModule: path.resolve(DUCKDB_DIST, './duckdb-mvp.wasm'),
          mainWorker: path.resolve(DUCKDB_DIST, './duckdb-node-mvp.worker.cjs'),
        },
        eh: {
          mainModule: path.resolve(DUCKDB_DIST, './duckdb-eh.wasm'),
          mainWorker: path.resolve(DUCKDB_DIST, './duckdb-node-eh.worker.cjs'),
        },
      }


      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)


      const worker = new Worker(bundle.mainWorker!)

      // Polyfill for Node.js worker_threads to make it compatible with Web Worker API
      if (!(worker as any).addEventListener) {
        (worker as any).addEventListener = (type: string, listener: any) => {
          worker.on(type, listener)
        }
      }
      if (!(worker as any).removeEventListener) {
        (worker as any).removeEventListener = (type: string, listener: any) => {
          worker.off(type, listener)
        }
      }
      if (!(worker as any).dispatchEvent) {
        (worker as any).dispatchEvent = (event: any) => {
          worker.emit(event.type, event)
        }
      }

      const logger = new duckdb.ConsoleLogger()


      this.db = new duckdb.AsyncDuckDB(logger, worker as any)
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker)


      this.conn = await this.db.connect()
      this.isReady = true


      await this.query("SET memory_limit='2GB'")
      await this.query('SET threads=4')

      console.log('DuckDB-WASM initialized successfully')
    } catch (error) {
      console.error('Failed to initialize DuckDB-WASM:', error)
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


      const arrowTable = await this.conn.query(sql)
      return arrowTable.toArray().map(row => row.toJSON())
    })
  }

  async exec(sql: string): Promise<void> {
    await this.query(sql)
  }

  async getSchema(tableName?: string): Promise<any> {
    try {
      await this.ensureInitialized()
      if (!this.conn) {
        throw new Error('Database not initialized')
      }

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
        await this.conn.close()
        this.conn = null
      }

      if (this.db) {
        await this.db.terminate()
        this.db = null
      }

      this.isReady = false
      console.log('DuckDB-WASM connection closed')
    })
  }

  async registerFileText(filename: string, data: string): Promise<void> {
    await this.ensureInitialized()
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    await this.db.registerFileText(filename, data)
  }

  getDb(): duckdb.AsyncDuckDB {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  getConn(): duckdb.AsyncDuckDBConnection {
    if (!this.conn) {
      throw new Error('Database connection not initialized')
    }
    return this.conn
  }
}
