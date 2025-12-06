import * as XLSX from 'xlsx'
import { extname } from 'path'
import { DatabaseService } from '../database/duckdb'

export class FileService {
  constructor(private databaseService: DatabaseService) {}

  async parseFile(filePath: string) {
    const ext = extname(filePath).toLowerCase()
    
    switch (ext) {
      case '.xlsx':
      case '.xls':
        return this.parseExcelFile(filePath)
      case '.csv':
        return this.parseCSVFile(filePath)
      default:
        throw new Error(`Unsupported file type: ${ext}`)
    }
  }

  private async parseExcelFile(filePath: string) {
    try {
      // 读取 Excel 文件
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // 转换为 JSON 数据
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null 
      }) as any[][]
      
      if (jsonData.length === 0) {
        throw new Error('Excel file is empty')
      }
      
      // 处理合并单元格和空行
      const cleanedData = this.cleanExcelData(jsonData)
      
      // 创建临时表名
      const tableName = `temp_${Date.now()}`
      
      // 将数据导入 DuckDB
      await this.databaseService.createTableFromData(tableName, cleanedData)
      
      // 获取表结构
      const schema = await this.databaseService.getSchema(tableName)
      
      return {
        tableName,
        schema,
        rowCount: cleanedData.length - 1, // 减去表头
        preview: cleanedData.slice(0, 6) // 前5行数据预览
      }
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async parseCSVFile(filePath: string) {
    try {
      // 使用 DuckDB 直接读取 CSV
      const tableName = `temp_${Date.now()}`
      const sql = `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${filePath.replace(/\\/g, '/')}')`
      
      await this.databaseService.query(sql)
      
      // 获取表结构和预览数据
      const schema = await this.databaseService.getSchema(tableName)
      const preview = await this.databaseService.query(`SELECT * FROM ${tableName} LIMIT 5`)
      const countResult = await this.databaseService.query(`SELECT COUNT(*) as count FROM ${tableName}`)
      
      return {
        tableName,
        schema,
        rowCount: countResult[0].count,
        preview
      }
    } catch (error) {
      throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private cleanExcelData(data: any[][]): any[][] {
    // 移除完全空的行
    const nonEmptyRows = data.filter(row => 
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )
    
    if (nonEmptyRows.length === 0) {
      throw new Error('No valid data found in Excel file')
    }
    
    // 确保所有行都有相同的列数（以第一行为准）
    const headerRow = nonEmptyRows[0]
    const columnCount = headerRow.length
    
    return nonEmptyRows.map(row => {
      const normalizedRow = [...row]
      // 补齐缺失的列
      while (normalizedRow.length < columnCount) {
        normalizedRow.push(null)
      }
      // 截断多余的列
      return normalizedRow.slice(0, columnCount)
    })
  }
}
