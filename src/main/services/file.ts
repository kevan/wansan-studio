import fs from 'fs-extra'
import { extname, basename } from 'path'
import { NativeDatabaseService } from './native-db-service'
import {
  ingestExcelFile,
  getUniqueTableName,
  ingestJsonData,
  getSampleValues,
} from '../engine/ingestion'
import { DEMO_DATA } from '../../shared/demo-data'
import { ReloadResult, ColumnSchema, ColumnType } from '../../shared/types'
import { normalizeDuckDBType } from '../../shared/type-utils'
import { IngestPreCheckParams, IngestPreCheckResponse, AppendDataParams } from '../../shared/electron-api'

export class FileService {
  constructor(private databaseService: NativeDatabaseService) {}

  async parseFile(filePath: string, prefix: string = 'temp_ingest_') {
    console.log('parseFile', filePath)
    const ext = extname(filePath).toLowerCase()

    switch (ext) {
      case '.xlsx':
      case '.xls':
        return this.parseExcelFile(filePath, prefix)
      case '.csv':
      case '.json':
        return this.parseCSVFile(filePath, prefix)
      default:
        throw new Error(`Unsupported file type: ${ext}`)
    }
  }

  private async parseExcelFile(filePath: string, prefix: string = 't_') {
    try {
      const fileName = basename(filePath)
      const schemas = await ingestExcelFile(
        filePath,
        this.databaseService,
        fileName,
        undefined,
        undefined,
        undefined,
        prefix
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

  private async parseCSVFile(filePath: string, prefix: string = 't_') {
    try {
      const fileName = basename(filePath)
      const tableName = await getUniqueTableName(this.databaseService, fileName, undefined, prefix)

      // Use DuckDB's read_csv_auto to handle the CSV directly from the file path
      // [FIX] Escape backslashes for Windows paths
      const safePath = filePath.replace(/\\/g, '/')
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${safePath}', HEADER = TRUE, SAMPLE_SIZE = -1, auto_detect=true)`
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
  
  async reIngestFile(
    filePath: string,
    tableName: string,
    sheetName?: string,
    onProgress?: (rowCount: number) => void
  ): Promise<ReloadResult> {
    // 处理 Demo 数据（DEMO_MEMORY 路径）
    if (filePath === 'DEMO_MEMORY') {
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
      // We pass the targetTableName to force overwrite
      const schemas = await ingestExcelFile(
        filePath,
        this.databaseService,
        fileName,
        tableName, // targetTableName
        sheetName,
        onProgress,
        't_' // Permanent prefix for re-ingest
      )

      if (schemas.length > 0) {
        columns = schemas[0].columns
      } else {
        throw new Error(
          `Re-ingestion failed: No table found for ${filePath} (Sheet: ${sheetName || 'First'})`
        )
      }
    } else if (ext === '.csv') {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)

      const safePath = filePath.replace(/\\/g, '/')
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${safePath}', HEADER = TRUE, SAMPLE_SIZE = -1, auto_detect=true)`
      )

      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      for (const col of columnsResult) {
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

      const safePath = filePath.replace(/\\/g, '/')
      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${safePath}', format='auto', auto_detect=true)`
      )

      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}');`
      )

      for (const col of columnsResult) {
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

  async finalizeIngestion(tempTableName: string, finalTableName: string) {
    console.log('[FileService] finalizeIngestion', tempTableName, finalTableName)
    await this.databaseService.exec(`ALTER TABLE "${tempTableName}" RENAME TO "${finalTableName}" `)
  }

  async cleanupStaging(tempTableNames: string[]) {
    console.log('[FileService] cleanupStaging', tempTableNames)
    for (const name of tempTableNames) {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${name}" `)
    }
  }

  async cleanupAllStaging(): Promise<void> {
    console.log('[FileService] cleanupAllStaging: Dropping all temp_ingest_* tables.')
    const tables = await this.databaseService.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'temp_ingest_%'`
    );
    for (const table of tables) {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${(table as any).table_name}" `)
    }
  }

  async ingestPreCheck(
    params: IngestPreCheckParams
  ): Promise<IngestPreCheckResponse> {
    const { filePath, targetTableName, sheetName, uniqueKeys, columnMapping } = params
    const parseResults = await this.parseFile(filePath)
    
    if (!parseResults || parseResults.length === 0) {
      throw new Error('Failed to parse file or no sheets found for pre-check');
    }

    const targetSheet = sheetName
      ? parseResults.find(r => r.sheetName === sheetName)
      : parseResults[0]

    if (!targetSheet) throw new Error('Source sheet not found');
    const taskTable = targetSheet.tableName;
    const totalRows = Number(targetSheet.rowCount);

    try {
      const sourceCols = (await this.databaseService.query(`PRAGMA table_info('${taskTable}')`)).map((c: any) => c.name)
      const targetCols = (await this.databaseService.query(`PRAGMA table_info('${targetTableName}')`)).map((c: any) => c.name)
      const targetSet = new Set(targetCols)
      const sourceSet = new Set(sourceCols)

      let duplicateRows = 0
      if (uniqueKeys && uniqueKeys.length > 0) {
        // Filter unique keys that are actually mapped to source columns
        const validKeys = uniqueKeys.filter(k => targetSet.has(k) && sourceSet.has(columnMapping[k] as string))
        
        if (validKeys.length > 0) {
          const joinConditions = validKeys.map(k => {
            const sourceCol = columnMapping[k];
            return `t1."${sourceCol}" = t2."${k}"`;
          }).join(' AND ');

          const dupRes = await this.databaseService.query(`
            SELECT COUNT(*) as count 
            FROM "${taskTable}" AS t1 
            JOIN "${targetTableName}" AS t2 ON ${joinConditions}
          `);
          duplicateRows = Number(dupRes[0].count);
        }
      }

      return {
        totalRows,
        duplicateRows,
        columnMatch: { 
          matched: sourceCols.filter(c => targetSet.has(c)), 
          missing: targetCols.filter(c => !sourceSet.has(c)), 
          extra: sourceCols.filter(c => !targetSet.has(c)) 
        },
      }
    } finally {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${taskTable}" `)
    }
  }

  async appendData(params: AppendDataParams): Promise<{ rowCount: number }> {
    const { filePath, targetTableName, sheetName, uniqueKeys, strategy, columnMapping } = params
    const parseResults = await this.parseFile(filePath)
    const targetSheet = sheetName ? parseResults.find(r => r.sheetName === sheetName) : parseResults[0]
    if (!targetSheet) throw new Error('Source sheet not found')
    const taskTable = targetSheet.tableName

    try {
      const mappedSelects: string[] = []
      const targetCols: string[] = []
      
      for (const [targetCol, sourceCol] of Object.entries(columnMapping)) {
        if (sourceCol) {
          mappedSelects.push(`"${sourceCol}" AS "${targetCol}" `)
          targetCols.push(`"${targetCol}" `)
        }
      }
      
      if (targetCols.length === 0) throw new Error("No columns were mapped.")
      
      const selectClause = mappedSelects.join(', ')
      const colList = targetCols.join(', ')

      if (uniqueKeys && uniqueKeys.length > 0) {
        const validPKs = uniqueKeys.filter(k => columnMapping[k])

        if (validPKs.length > 0) {
          if (strategy === 'replace') {
            const deleteWhere = validPKs.map(k => `"${k}" IN (SELECT "${columnMapping[k]}" FROM "${taskTable}")`).join(' AND ')
            await this.databaseService.exec(`DELETE FROM "${targetTableName}" WHERE ${deleteWhere}`)
          }
          
          const insertQuery = `
            INSERT INTO "${targetTableName}" (${colList})
            SELECT ${selectClause} 
            FROM "${taskTable}" AS src
            ${strategy === 'ignore' ? `WHERE NOT EXISTS (
              SELECT 1 FROM "${targetTableName}" AS tgt 
              WHERE ${validPKs.map(k => `tgt."${k}" = src."${columnMapping[k]}"`).join(' AND ')}
            )` : ''}
          `
          await this.databaseService.exec(insertQuery)

        } else {
          // No valid keys to join on, so just bulk insert
          await this.databaseService.exec(`INSERT INTO "${targetTableName}" (${colList}) SELECT ${selectClause} FROM "${taskTable}" `)
        }
      } else {
        await this.databaseService.exec(`INSERT INTO "${targetTableName}" (${colList}) SELECT ${selectClause} FROM "${taskTable}" `)
      }

      const countRes = await this.databaseService.query(`SELECT COUNT(*) as count FROM "${targetTableName}" `)
      return { rowCount: Number(countRes[0].count) }
    } finally {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${taskTable}" `)
    }
  }
}