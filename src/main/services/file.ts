import fs from 'fs-extra'
import { extname, basename } from 'path'
import { DatabaseService } from '../database/duckdb'
import { ingestExcelFile, getUniqueTableName } from '../engine/ingestion'
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
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          }`
        )
      }
    }
  }

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
      const { tableName, description } = await ingestExcelFile(
        fileBuffer,
        this.databaseService.getDb(),
        fileName
      )

      // Post-ingestion queries to get additional info
      let schema = await this.databaseService.getSchema(tableName)
      if (description) {
        schema.description = description
      }

      schema = await this.enrichSchemaWithSamples(tableName, schema)

      const preview = await this.databaseService.query(
        `SELECT * FROM "${tableName}" LIMIT 5`
      )
      const countResult = await this.databaseService.query(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )

      return {
        tableName,
        schema,
        rowCount: countResult[0].count,
        preview,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async parseCSVFile(filePath: string) {
    try {
      const fileName = basename(filePath)
      // Using DuckDB's CSV reader is efficient.
      const tableName = await getUniqueTableName(
        this.databaseService.getDb(),
        fileName
      )
      await this.ingestCSVWithFallback(filePath, tableName)

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

      return {
        tableName,
        schema,
        rowCount: countResult[0].count,
        preview,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async reIngestFile(
    filePath: string,
    tableName: string
  ): Promise<ReloadResult> {
    const ext = extname(filePath).toLowerCase()
    const stats = await fs.stat(filePath)
    let columns: ColumnSchema[] = []

    if (ext === '.xlsx' || ext === '.xls') {
      const fileBuffer = await fs.readFile(filePath)
      const fileName = basename(filePath)
      // ingestExcelFile returns TableSchema which has columns
      const result = await ingestExcelFile(
        fileBuffer,
        this.databaseService.getDb(),
        fileName,
        tableName
      )
      columns = result.columns
    } else if (ext === '.csv') {
      await this.databaseService.query(`DROP TABLE IF EXISTS "${tableName}"`)
      await this.ingestCSVWithFallback(filePath, tableName)

      // We need to fetch the schema manually for CSV as we did in parseCSVFile
      // Ideally parseCSVFile logic should be extracted but for now duplication is small
      const columnsResult = await new Promise<any[]>((resolve, reject) => {
        this.databaseService
          .getDb()
          .all(`PRAGMA table_info('${tableName}');`, (err, res) => {
            if (err) return reject(err)
            resolve(res)
          })
      })

      for (const col of columnsResult) {
        // We can't easily get sample values here without importing getSampleValues helper or duplicate it.
        // But ingestExcelFile uses getSampleValues.
        // Let's reuse DatabaseService.getSchema logic?
        // DatabaseService.getSchema returns { columns: ... } but maybe not sampleValues as robustly as ingestion?
        // Actually DatabaseService.getSchema calls PRAGMA table_info too.
        // ingestExcelFile calculates sampleValues.
        // For CSV, we didn't calculate sampleValues in reIngestFile before (it was missing).
        // Now we need newColumns.

        // Let's use databaseService.query to get sample values
        const samplesRes = await this.databaseService.query(
          `SELECT DISTINCT "${col.name}" FROM "${tableName}" WHERE "${col.name}" IS NOT NULL LIMIT 3`
        )
        const sampleValues = samplesRes.map(row => {
          const val = row[col.name]
          return typeof val === 'bigint' ? val.toString() : val
        })

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

    return {
      lastModified: stats.mtimeMs,
      newColumns: columns,
    }
  }
}
