import * as duckdb from 'duckdb'

export class DatabaseService {
  private db: duckdb.Database | null = null
  private connection: duckdb.Connection | null = null

  async initialize(): Promise<void> {
    try {
      // 创建内存数据库（用于临时数据处理）
      this.db = new duckdb.Database(':memory:')
      
      // 创建连接
      this.connection = this.db.connect()
      
      // 设置一些有用的配置
      await this.query("SET memory_limit='1GB'")
      await this.query("SET threads=4")
      
      console.log('DuckDB initialized successfully')
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error)
      throw error
    }
  }

  async query(sql: string): Promise<any[]> {
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
  }

  async createTableFromData(tableName: string, data: any[][]): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No data provided')
    }

    // 第一行作为列名
    const headers = data[0]
    const rows = data.slice(1)

    if (headers.length === 0) {
      throw new Error('No columns found')
    }

    // 清理列名（移除特殊字符，确保有效的 SQL 标识符）
    const cleanHeaders = headers.map((header, index) => {
      let cleanName = String(header || `column_${index + 1}`)
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^[0-9]/, 'col_$&')
      
      // 确保不为空
      if (!cleanName || cleanName === '_') {
        cleanName = `column_${index + 1}`
      }
      
      return cleanName
    })

    // 删除已存在的表
    try {
      await this.query(`DROP TABLE IF EXISTS ${tableName}`)
    } catch (error) {
      // 忽略删除错误
    }

    // 分析数据类型
    const columnTypes = this.inferColumnTypes(rows, cleanHeaders.length)
    
    // 创建表结构
    const columnDefs = cleanHeaders.map((name, index) => 
      `"${name}" ${columnTypes[index]}`
    ).join(', ')
    
    const createTableSQL = `CREATE TABLE ${tableName} (${columnDefs})`
    await this.query(createTableSQL)

    // 插入数据
    if (rows.length > 0) {
      const placeholders = cleanHeaders.map(() => '?').join(', ')
      const insertSQL = `INSERT INTO ${tableName} VALUES (${placeholders})`
      
      // 批量插入数据
      for (const row of rows) {
        const values = row.slice(0, cleanHeaders.length).map(value => {
          // 处理空值
          if (value === null || value === undefined || value === '') {
            return null
          }
          return value
        })
        
        // 补齐缺失的列
        while (values.length < cleanHeaders.length) {
          values.push(null)
        }
        
        await this.insertRow(insertSQL, values)
      }
    }
  }

  private async insertRow(sql: string, values: any[]): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      this.connection!.run(sql, values, (err: Error | null) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  private inferColumnTypes(rows: any[][], columnCount: number): string[] {
    const types = new Array(columnCount).fill('VARCHAR')
    
    if (rows.length === 0) {
      return types
    }

    // 分析每列的数据类型
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      let hasNumbers = 0
      let hasIntegers = 0
      let hasDecimals = 0
      let hasDates = 0
      let totalNonNull = 0

      for (const row of rows.slice(0, Math.min(100, rows.length))) {
        const value = row[colIndex]
        
        if (value === null || value === undefined || value === '') {
          continue
        }
        
        totalNonNull++
        const strValue = String(value).trim()
        
        // 检查是否为数字
        if (!isNaN(Number(strValue)) && strValue !== '') {
          hasNumbers++
          if (Number.isInteger(Number(strValue))) {
            hasIntegers++
          } else {
            hasDecimals++
          }
        }
        
        // 检查是否为日期
        if (this.isDateLike(strValue)) {
          hasDates++
        }
      }

      // 根据分析结果确定类型
      if (totalNonNull === 0) {
        types[colIndex] = 'VARCHAR'
      } else if (hasDates / totalNonNull > 0.8) {
        types[colIndex] = 'DATE'
      } else if (hasNumbers / totalNonNull > 0.8) {
        if (hasDecimals > 0) {
          types[colIndex] = 'DOUBLE'
        } else {
          types[colIndex] = 'BIGINT'
        }
      } else {
        types[colIndex] = 'VARCHAR'
      }
    }

    return types
  }

  private isDateLike(value: string): boolean {
    // 简单的日期格式检测
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{2}-\d{2}-\d{4}$/
    ]
    
    return datePatterns.some(pattern => pattern.test(value)) && !isNaN(Date.parse(value))
  }

  async getSchema(tableName?: string): Promise<any> {
    if (!tableName) {
      // 返回所有表的信息
      const tables = await this.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'")
      return { tables }
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
      columns
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
    
    if (this.db) {
      this.db.close()
      this.db = null
    }
    
    console.log('DuckDB connection closed')
  }
}
