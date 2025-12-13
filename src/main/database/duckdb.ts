import duckdb from 'duckdb'
import { Mutex } from 'async-mutex'

export class DatabaseService {
  private db: duckdb.Database | null = null
  private connection: duckdb.Connection | null = null
  private mutex: Mutex = new Mutex()

  async initialize(): Promise<void> {
    try {
      // 创建内存数据库（用于临时数据处理）
      this.db = new duckdb.Database(':memory:')

      // 创建连接
      this.connection = this.db.connect()

      // 设置一些有用的配置
      await this.query('SET memory_limit=\'1GB\'')
      await this.query('SET threads=4')

      console.log('DuckDB initialized successfully')
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error)
      throw error
    }
  }

  async query(sql: string): Promise<any[]> {
    return this.mutex.runExclusive(async () => {
      if (!this.connection) {
        throw new Error('Database not initialized')
      }

      return new Promise((resolve, reject) => {
        this.connection!.all(sql, (err: Error | null, result: any[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(result || [])
          }
        })
      })
    })
  }

  async getSchema(tableName?: string): Promise<any> {
    try {
      if (!this.connection) {
        throw new Error('Database not initialized')
      }

      if (!tableName) {
        // 返回所有表的信息，包含列详情
        const tablesResult = await this.query(
          'SELECT table_name FROM information_schema.tables WHERE table_schema = \'main\'',
        )

        if (!tablesResult || tablesResult.length === 0) {
          return { tables: [] }
        }

        // 并行获取每个表的详细结构
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
          }),
        )

        return { tables: tablesWithDetails }
      }

      // 返回特定表的结构信息
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

  getDb(): duckdb.Database {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  async close(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      if (this.connection) {
        this.connection.close()
        this.connection = null
      }

      if (this.db) {
        this.db.close()
        this.db = null
      }

      console.log('DuckDB connection closed')
    })
  }
}
