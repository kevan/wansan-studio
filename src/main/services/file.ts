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

// Intelligent Time Anchor Detection
function findTimeAnchor(columns: ColumnSchema[]): string | null {
  // Priority 1: True Date/Timestamp Types (Inferred by DuckDB)
  const typeMatch = columns.find(col => {
    const type = (col.type || '').toUpperCase()
    return type.includes('DATE') || type.includes('TIMESTAMP')
  })
  if (typeMatch) return typeMatch.name

  // Priority 2: Semantic Naming (Fall back for Strings)
  const keywords = [
    'date',
    'time',
    'year',
    'month',
    'day',
    '日期',
    '时间',
    '年份',
    'created_at',
    'updated_at',
  ]
  const nameMatch = columns.find(col =>
    keywords.some(kw => (col.name || '').toLowerCase().includes(kw))
  )

  return nameMatch ? nameMatch.name : null
}

export class FileService {
  constructor(private databaseService: DatabaseService) {}

  private async ingestCSVWithFallback(
    filePath: string,
    tableName: string
  ): Promise<void> {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const createWithAuto = `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${normalizedPath}', SAMPLE_SIZE=-1)`
    try {
      await this.databaseService.query(createWithAuto)
      return
    } catch (error) {
      console.warn('read_csv_auto failed, retrying with manual options', error)
      // Clear any partial table before retrying
      await this.databaseService.query(`DROP TABLE IF EXISTS "${tableName}"`)
      const createWithDefaults = `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv('${normalizedPath}', HEADER=TRUE, DELIM=',')`
      try {
        await this.databaseService.query(createWithDefaults)
        return
      } catch (fallbackError) {
        console.error('CSV ingestion failed after fallback', fallbackError)
        throw new Error(
          `Failed to parse CSV file: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : 'Unknown error'
          }`
        )
      }
    }
  }

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

  private async enrichSchemaWithSamples(tableName: string, schema: any) {
    if (!schema.columns) return schema

    const timeAnchor = findTimeAnchor(schema.columns)
    const sourceTable = timeAnchor
      ? `(SELECT * FROM "${tableName}" ORDER BY "${timeAnchor}" DESC LIMIT 1000)`
      : `"${tableName}"`

    for (const col of schema.columns) {
      try {
        const query = `
          SELECT DISTINCT "${col.name}"::VARCHAR as val 
          FROM ${sourceTable} 
          WHERE "${col.name}" IS NOT NULL 
          LIMIT 3
        `

        const rows = await this.databaseService.query(query)
        col.sampleValues = rows.map((r: any) => r.val)
      } catch (error) {
        console.warn(`Failed to sample ${col.name}`, error)
        col.sampleValues = []
      }
    }

    return schema
  }

  private async parseExcelFile(filePath: string) {
    try {
      const fileBuffer = await fs.readFile(filePath)
      const fileName = basename(filePath)
      const schemas = await ingestExcelFile(
        fileBuffer,
        this.databaseService,
        fileName
      )

      const results = []

      for (const schemaItem of schemas) {
        // Post-ingestion queries to get additional info
        let schema = await this.databaseService.getSchema(schemaItem.tableName)
        if (schemaItem.description) {
          schema.description = schemaItem.description
        }

        schema = await this.enrichSchemaWithSamples(
          schemaItem.tableName,
          schema
        )

        const preview = await this.databaseService.query(
          `SELECT * FROM "${schemaItem.tableName}" LIMIT 5`
        )
        const countResult = await this.databaseService.query(
          `SELECT COUNT(*) as count FROM "${schemaItem.tableName}"`
        )

        // Try to extract sheet name from description if it matches format "File - Sheet"
        // This is a bit hacky, but consistent with ingestion.ts logic
        let sheetName: string | undefined
        if (schemaItem.description && schemaItem.description.includes(' - ')) {
          const parts = schemaItem.description.split(' - ')
          if (parts.length > 1) {
            sheetName = parts.slice(1).join(' - ')
          }
        } else if (schemas.length === 1) {
          // Single sheet, maybe don't set sheetName explicitly or set to 'Sheet1' if we can't determine?
          // Actually ingestion.ts doesn't return sheetName in Schema, only description.
          // We can proceed without sheetName or infer it if we want.
        }

        results.push({
          tableName: schemaItem.tableName,
          schema,
          rowCount: countResult[0].count,
          preview,
          sheetName,
        })
      }

      // Return array or single object if only 1?
      // To be consistent and allow frontend to iterate, array is better.
      // But for backward compatibility with other file types (CSV/JSON) which return single object...
      // I should probably wrap CSV/JSON in array too or make frontend handle both.
      // Let's make parseFile always return array?
      // No, parseCSVFile returns single object.
      // If I change parseFile return type, I need to standardize.

      // Let's return array for Excel, and update frontend to handle Array | Object.
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

      // Read CSV content and register as virtual file
      const csvContent = await fs.readFile(filePath, 'utf-8')
      const tempCsvName = `${tableName}.csv`
      await this.databaseService.registerFileText(tempCsvName, csvContent)

      // Use DuckDB's read_csv_auto to handle the CSV
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${tempCsvName}', SAMPLE_SIZE=-1, auto_detect=true)`
      )

      // Get schema and preview data
      let schema = await this.databaseService.getSchema(tableName)
      schema.description = fileName

      schema = await this.enrichSchemaWithSamples(tableName, schema)

      const preview = await this.databaseService.query(
        `SELECT * FROM "${tableName}" LIMIT 5`
      )
      const countResult = await this.databaseService.query(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )

      // Wrap in array for consistency?
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

      // Read JSON content and register as virtual file
      const jsonContent = await fs.readFile(filePath, 'utf-8')
      const tempJsonName = `${tableName}.json`
      await this.databaseService.registerFileText(tempJsonName, jsonContent)

      // Use DuckDB's read_json_auto to handle the JSON
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${tempJsonName}', format='auto', auto_detect=true)`
      )

      // Get schema and preview data
      let schema = await this.databaseService.getSchema(tableName)
      schema.description = fileName

      schema = await this.enrichSchemaWithSamples(tableName, schema)

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
    sheetName?: string // New optional param
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
      const fileBuffer = await fs.readFile(filePath)
      const fileName = basename(filePath)
      // ingestExcelFile returns TableSchema[]
      const schemas = await ingestExcelFile(
        fileBuffer,
        this.databaseService,
        fileName,
        tableName,
        sheetName
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

      // Read CSV content and register as virtual file
      const csvContent = await fs.readFile(filePath, 'utf-8')
      const tempCsvName = `${tableName}.csv`
      await this.databaseService.registerFileText(tempCsvName, csvContent)

      // Use DuckDB's read_csv_auto to handle the CSV
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${tempCsvName}', SAMPLE_SIZE=-1, auto_detect=true)`
      )

      // Fetch schema for the reloaded CSV
      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      for (const col of columnsResult) {
        const sampleValues = await getSampleValues(
          this.databaseService,
          tableName,
          col.name,
          col.type
        )

        columns.push({
          name: col.name,
          safeName: col.name,
          type: col.type as ColumnType,
          sampleValues,
        })
      }
    } else if (ext === '.json') {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)

      // Read JSON content and register as virtual file
      const jsonContent = await fs.readFile(filePath, 'utf-8')
      const tempJsonName = `${tableName}.json`
      await this.databaseService.registerFileText(tempJsonName, jsonContent)

      // Use DuckDB's read_json_auto to re-ingest JSON file
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${tempJsonName}', format='auto', auto_detect=true)`
      )

      // Fetch schema for the reloaded JSON
      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      for (const col of columnsResult) {
        const sampleValues = await getSampleValues(
          this.databaseService,
          tableName,
          col.name,
          col.type
        )

        columns.push({
          name: col.name,
          safeName: col.name,
          type: col.type as ColumnType,
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
