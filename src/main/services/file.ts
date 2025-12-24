import fs from 'fs-extra'
import { extname, basename } from 'path'
import { DatabaseService } from '../database/duckdb'
import {
  ingestExcelFile,
  getUniqueTableName,
  ingestJsonData,
  getSampleValues,
} from '../engine/ingestion'
import { DEMO_DATA } from '../../shared/demo-data'
import { ReloadResult, ColumnSchema, ColumnType } from '../../shared/types'
import { normalizeDuckDBType } from '../../shared/type-utils'

// Helper to infer TIMESTAMP type from column name if DuckDB detects it as number
export class FileService {
  constructor(private databaseService: DatabaseService) {}

  async parseFile(filePath: string) {
    console.log('parseFile', filePath)
    const ext = extname(filePath).toLowerCase()

    switch (ext) {
      case '.xlsx':
      case '.xls':
        return this.parseExcelFile(filePath)
      case '.csv':
        return this.parseCSVFile(filePath)
      case '.json':
        return this.parseJsonFile(filePath)
      default:
        throw new Error(`Unsupported file type: ${ext}`)
    }
  }

  private async parseExcelFile(filePath: string) {
    try {
      const fileName = basename(filePath)
      const schemas = await ingestExcelFile(
        filePath,
        this.databaseService,
        fileName
      )

      const results = []

      for (const schemaItem of schemas) {
        const preview = await this.databaseService.query(
          `SELECT * FROM "${schemaItem.tableName}" LIMIT 5`
        )
        const countResult = await this.databaseService.query(
          `SELECT COUNT(*) as count FROM "${schemaItem.tableName}"`
        )

        // Try to extract sheet name from description if it matches format "File - Sheet"
        let sheetName: string | undefined
        if (schemaItem.description && schemaItem.description.includes(' - ')) {
          const parts = schemaItem.description.split(' - ')
          if (parts.length > 1) {
            sheetName = parts.slice(1).join(' - ')
          }
        }

        results.push({
          tableName: schemaItem.tableName,
          schema: schemaItem,
          rowCount: countResult[0].count,
          preview,
          sheetName,
        })
      }

      return results
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async parseCSVFile(filePath: string) {
    try {
      const fileName = basename(filePath)
      const tableName = await getUniqueTableName(this.databaseService, fileName)

      // Use DuckDB's read_csv_auto to handle the CSV directly from the file path
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${filePath}', SAMPLE_SIZE=-1, auto_detect=true)`
      )

      // Fetch schema using PRAGMA table_info for consistency
      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      const columns: ColumnSchema[] = []
      for (const col of columnsResult) {
        // Apply semantic type inference
        const finalType = normalizeDuckDBType(col.type)

        const sampleValues = await getSampleValues(
          this.databaseService,
          tableName,
          col.name,
          finalType
        )
        columns.push({
          name: col.name,
          safeName: col.name,
          type: finalType as ColumnType,
          sampleValues,
        })
      }

      const schema = {
        tableName,
        description: fileName,
        columns,
      }

      const preview = await this.databaseService.query(
        `SELECT * FROM "${tableName}" LIMIT 5`
      )
      const countResult = await this.databaseService.query(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )

      return [
        {
          tableName,
          schema,
          rowCount: countResult[0].count,
          preview,
        },
      ]
    } catch (error) {
      throw new Error(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async parseJsonFile(filePath: string) {
    try {
      const fileName = basename(filePath)
      const tableName = await getUniqueTableName(this.databaseService, fileName)

      // Use DuckDB's read_json_auto to handle the JSON directly from the file path
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${filePath}', format='auto', auto_detect=true)`
      )

      // Fetch schema using PRAGMA table_info for consistency
      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      const columns: ColumnSchema[] = []
      for (const col of columnsResult) {
        // Apply semantic type inference
        const finalType = normalizeDuckDBType(col.type)

        const sampleValues = await getSampleValues(
          this.databaseService,
          tableName,
          col.name,
          finalType
        )
        columns.push({
          name: col.name,
          safeName: col.name,
          type: finalType as ColumnType,
          sampleValues,
        })
      }

      const schema = {
        tableName,
        description: fileName,
        columns,
      }

      const preview = await this.databaseService.query(
        `SELECT * FROM "${tableName}" LIMIT 5`
      )
      const countResult = await this.databaseService.query(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )

      return [
        {
          tableName,
          schema,
          rowCount: countResult[0].count,
          preview,
        },
      ]
    } catch (error) {
      console.error('Failed to parse JSON file:', error)
      throw new Error(
        `Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}. The JSON might have inconsistent field types or structure.`
      )
    }
  }
  async reIngestFile(
    filePath: string,
    tableName: string,
    sheetName?: string, // New optional param
    onProgress?: (rowCount: number) => void
  ): Promise<ReloadResult> {
    // 处理 Demo 数据（DEMO_MEMORY 路径）
    if (filePath === 'DEMO_MEMORY') {
      // 重新摄取 Demo 数据
      const result = await ingestJsonData(
        this.databaseService,
        tableName,
        DEMO_DATA
      )
      console.log('reIngestFile', filePath, tableName, result.columns)
      return {
        lastModified: Date.now(),
        newColumns: result.columns,
      }
    }

    // Check existence first
    if (!fs.existsSync(filePath)) {
      throw new Error('FILE_NOT_FOUND')
    }

    const ext = extname(filePath).toLowerCase()
    const stats = await fs.stat(filePath)
    let columns: ColumnSchema[] = []

    if (ext === '.xlsx' || ext === '.xls') {
      const fileName = basename(filePath)
      // ingestExcelFile returns TableSchema[]
      const schemas = await ingestExcelFile(
        filePath,
        this.databaseService,
        fileName,
        tableName,
        sheetName,
        onProgress
      )
      // Since we pass tableName (and maybe sheetName), we expect 1 result which matches our target.
      // If we didn't pass sheetName and there are multiple sheets, ingestExcelFile might behave legacy (first sheet) or return all?
      // With my update, if targetTableName is passed and NO sheetName, it assumes first sheet.
      // If we want specific sheet, sheetName MUST be passed.

      if (schemas.length > 0) {
        columns = schemas[0].columns
      } else {
        throw new Error(
          `Re-ingestion failed: No table found for ${filePath} (Sheet: ${sheetName || 'First'})`
        )
      }
    } else if (ext === '.csv') {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)

      // Use DuckDB's read_csv_auto to handle the CSV directly from the file path
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${filePath}', SAMPLE_SIZE=-1, auto_detect=true)`
      )

      // Fetch schema for the reloaded CSV
      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      for (const col of columnsResult) {
        // Apply semantic type inference
        const finalType = normalizeDuckDBType(col.type)

        const sampleValues = await getSampleValues(
          this.databaseService,
          tableName,
          col.name,
          finalType
        )

        columns.push({
          name: col.name,
          safeName: col.name,
          type: finalType as ColumnType,
          sampleValues,
        })
      }
    } else if (ext === '.json') {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)

      // Use DuckDB's read_json_auto to re-ingest JSON file directly from path
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${filePath}', format='auto', auto_detect=true)`
      )

      // Fetch schema for the reloaded JSON
      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      for (const col of columnsResult) {
        // Apply semantic type inference
        const finalType = normalizeDuckDBType(col.type)

        const sampleValues = await getSampleValues(
          this.databaseService,
          tableName,
          col.name,
          finalType
        )

        columns.push({
          name: col.name,
          safeName: col.name,
          type: finalType as ColumnType,
          sampleValues,
        })
      }
    } else {
      throw new Error(`Unsupported file type: ${ext}`)
    }
    console.log('reIngestFile', filePath, tableName, columns)

    return {
      lastModified: stats.mtimeMs,
      newColumns: columns,
    }
  }
}
