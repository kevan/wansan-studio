import fs from 'fs-extra'
import { extname, basename, join } from 'path'
import { NativeDatabaseService } from './native-db-service'
import { TempFileManager } from '../utils/temp-manager'
import {
  ingestExcelFile,
  getUniqueTableName,
  ingestJsonData,
  getSampleValues,
} from '../engine/ingestion'
import { DEMO_DATA } from '../../shared/demo-data'
import { ReloadResult, ColumnSchema, ColumnType } from '../../shared/types'
import { normalizeDuckDBType } from '../../shared/type-utils'
import { processSampleValue } from '../../shared/serialization'
import {
  IngestPreCheckParams,
  IngestPreCheckResponse,
  AppendDataParams,
  CreateTableParams,
} from '../../shared/electron-api'

export class FileService {
  constructor(private databaseService: NativeDatabaseService) {}

  async parseFile(filePath: string) {
    console.log('parseFile', filePath)
    const ext = extname(filePath).toLowerCase()

    switch (ext) {
      case '.xlsx':
      case '.xls':
        return this.parseExcelFile(filePath)
      case '.csv':
      case '.json':
        return this.parseCSVFile(filePath)
      default:
        throw new Error(`Unsupported file type: ${ext}`)
    }
  }

    private async parseExcelFile(filePath: string) {
      console.log('[FileService] parseExcelFile start:', filePath)
      try {
        const fileName = basename(filePath)
        
        console.log('[FileService] Calling ingestExcelFile for preview...')
        const schemas = await ingestExcelFile(
          filePath,
          this.databaseService,
          fileName,
          undefined,
          undefined,
          undefined,
          'temp_preview_' 
        )
        console.log('[FileService] ingestExcelFile returned schemas:', schemas.length)
  
        const results = []
        for (const schemaItem of schemas) {
        const preview = await this.databaseService.query(
          `SELECT * FROM "${schemaItem.tableName}" LIMIT 100`
        )
        const countResult = await this.databaseService.query(
          `SELECT COUNT(*) as count FROM "${schemaItem.tableName}"`
        )

        results.push({
          tableName: schemaItem.tableName, // This is a temp_preview table
          schema: schemaItem,
          rowCount: Number(countResult[0].count),
          preview,
          sheetName: schemaItem.sheetName, // Use explicit sheetName
        })

        // Immediately cleanup this temp_preview table, but KEEP the file for reuse

        await this.databaseService.exec(
          `DROP TABLE IF EXISTS "${schemaItem.tableName}"`
        )

        // File cleanup is now handled by the wizard lifecycle or periodic cleanup
      }

      return results
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

    private async parseCSVFile(filePath: string) {

      console.log('[FileService] parseCSVFile start:', filePath)

      try {

        const fileName = basename(filePath)

        const safePath = filePath.replace(/\\/g, '/')

  

        // 1. Get Preview Data & Count

        console.log('[FileService] Fetching preview data...')

        const preview = await this.databaseService.query(

          `SELECT * FROM read_csv_auto('${safePath}', SAMPLE_SIZE=-1, auto_detect=true) LIMIT 100`

        )

        console.log('[FileService] Preview fetched, rows:', preview?.length)

        

        // 2. Get Schema

        console.log('[FileService] Fetching schema...')

        const columnsResult = await this.databaseService.query(

          `DESCRIBE SELECT * FROM read_csv_auto('${safePath}', SAMPLE_SIZE=-1, auto_detect=true);`

        )

        console.log('[FileService] Schema fetched, cols:', columnsResult?.length)

  

        // 3. Process Schema & Extract Samples from Preview

        const columns: ColumnSchema[] = []

        if (columnsResult && preview) {

          for (const col of columnsResult) {

            const finalType = normalizeDuckDBType(col.column_type)

            

            // Extract up to 3 non-null samples from the preview data we already have

            const samples = preview

              .map(row => row[col.column_name])

              .filter(val => val !== null && val !== undefined && val !== '')

              .slice(0, 3)

              .map(val => processSampleValue(val, finalType as ColumnType))

  

            columns.push({

              name: col.column_name,

              safeName: col.column_name,

              type: finalType as ColumnType,

              sampleValues: samples,

            })

          }

        }

  

        const schema = {

          tableName: '', 

          description: fileName,

          columns,

        }

  

        console.log('[FileService] Fetching count...')

        const countResult = await this.databaseService.query(

          `SELECT COUNT(*) as count FROM read_csv_auto('${safePath}', auto_detect=true)`

        )

        console.log('[FileService] Count fetched:', countResult?.[0]?.count)

  

        return [

          {

            tableName: '',

            schema,

            rowCount: Number(countResult[0].count),

            preview,

          },

        ]

      } catch (error) {

        console.error('[FileService] parseCSVFile Error:', error)

        throw new Error(

          `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`

        )

      }

    }

  

  async reIngestFile(
    filePath: string,
    tableName: string,
    sheetName?: string,
    onProgress?: (rowCount: number) => void,
    knownColumns?: ColumnSchema[] // Add this param
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

    // Build types param if columns are provided
    let typesParam = ''
    if (knownColumns && knownColumns.length > 0) {
      const typesMap = knownColumns.reduce(
        (acc, col) => {
          acc[col.name] = col.type
          return acc
        },
        {} as Record<string, string>
      )
      const typesSql = Object.entries(typesMap)
        .map(([name, type]) => `'${name}': '${type}'`)
        .join(', ')
      typesParam = `types={${typesSql}}`
    }

    if (ext === '.xlsx' || ext === '.xls') {
      const fileName = basename(filePath)
      const schemas = await ingestExcelFile(
        filePath,
        this.databaseService,
        fileName,
        tableName,
        sheetName,
        onProgress,
        't_', // Permanent prefix
        typesParam // Pass types
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
      // Use typesParam if available
      const loadOptions = typesParam
        ? `${typesParam}, auto_detect=true`
        : `HEADER = TRUE, SAMPLE_SIZE = -1, auto_detect=true`

      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${safePath}', ${loadOptions})`
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
      const loadOptions = typesParam
        ? `${typesParam}, format='auto', auto_detect=true`
        : `format='auto', auto_detect=true`

      await this.databaseService.exec(
        `CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${safePath}', ${loadOptions})`
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

  async createTableFromSource(
    params: CreateTableParams
  ): Promise<{ rowCount: number; columns: ColumnSchema[] }> {
    const { filePath, tableName, sheetName, columns, tempFilePath } = params

    console.log('[FileService] createTableFromSource', {
      ...params,
      tempFilePath: tempFilePath ? 'PROVIDED' : 'NONE',
    })

    const ext = extname(filePath).toLowerCase()

    // Build the types map for DuckDB: {'col1': 'TYPE', 'col2': 'TYPE'}

    const typesMap = columns.reduce(
      (acc, col) => {
        acc[col.name] = col.type

        return acc
      },
      {} as Record<string, string>
    )

    const typesSql = Object.entries(typesMap)

      .map(([name, type]) => `'${name}': '${type}'`)

      .join(', ')

    const typesParam = `types={${typesSql}}`

    let tempFileToDrop: string | undefined

    try {
      if (ext === '.xlsx' || ext === '.xls') {
        if (tempFilePath && (await fs.pathExists(tempFilePath))) {
          // CACHE HIT

          const safeTempPath = tempFilePath.replace(/\\/g, '/')

          const loadOptions = typesParam
            ? `${typesParam}, auto_detect=true`
            : `HEADER=TRUE, SAMPLE_SIZE=-1, auto_detect=true`

          await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)

          await this.databaseService.exec(
            `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${safeTempPath}', ${loadOptions})`
          )
        } else {
          // CACHE MISS

          const fileName = basename(filePath)

          const schemas = await ingestExcelFile(
            filePath,

            this.databaseService,

            fileName,

            tableName,

            sheetName,

            undefined,

            't_',

            typesParam
          )

          if (schemas.length === 0)
            throw new Error('Excel ingestion produced no tables')

          tempFileToDrop = schemas[0].tempFilePath
        }
      } else {
        const reader = ext === '.csv' ? 'read_csv_auto' : 'read_json_auto'

        const safePath = filePath.replace(/\\/g, '/')

        await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`)

        await this.databaseService.exec(
          `CREATE TABLE "${tableName}" AS SELECT * FROM ${reader}('${safePath}', ${typesParam}, auto_detect=true)`
        )
      }

      const countRes = await this.databaseService.query(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )

      // Fetch fresh schema and samples

      const columnsResult = await this.databaseService.query(
        `PRAGMA table_info('${tableName}')`
      )

      const finalColumns: ColumnSchema[] = []

      for (const col of columnsResult) {
        const finalType = normalizeDuckDBType(col.type)

        const sampleValues = await getSampleValues(
          this.databaseService,

          tableName,

          col.name,

          finalType
        )

        finalColumns.push({
          name: col.name,

          safeName: col.name,

          type: finalType as ColumnType,

          sampleValues,
        })
      }

      return { rowCount: Number(countRes[0].count), columns: finalColumns }
    } catch (error) {
      console.error('[FileService] createTableFromSource error:', error)

      throw error
    } finally {
      if (tempFileToDrop && (await fs.pathExists(tempFileToDrop))) {
        await fs.remove(tempFileToDrop)
      }
    }
  }

  async cleanupStaging(tempTableNames: string[], tempFilePaths?: string[]) {
    console.log(
      '[FileService] cleanupStaging tables:',
      tempTableNames,
      'files:',
      tempFilePaths
    )

    // 1. Drop Tables
    for (const name of tempTableNames) {
      if (name && name.trim().length > 0) {
        await this.databaseService.exec(`DROP TABLE IF EXISTS "${name}" `)
      }
    }

    // 2. Delete Files
    if (tempFilePaths && tempFilePaths.length > 0) {
      for (const path of tempFilePaths) {
        if (path && (await fs.pathExists(path))) {
          await fs
            .remove(path)
            .catch(e => console.error('Failed to remove temp file:', path, e))
        }
      }
    }
  }

  async cleanupAllStaging(): Promise<void> {
    console.log(
      '[FileService] cleanupAllStaging: Dropping all temp_ingest_* tables.'
    )
    const tables = await this.databaseService.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'temp_ingest_%'`
    )
    for (const table of tables) {
      await this.databaseService.exec(
        `DROP TABLE IF EXISTS "${(table as any).table_name}" `
      )
    }

    // Also trigger file cleanup
    await this.cleanupTempFiles()
  }

  async cleanupTempFiles(): Promise<void> {
    await TempFileManager.cleanupOldFiles()
  }

  async ingestPreCheck(
    params: IngestPreCheckParams
  ): Promise<IngestPreCheckResponse> {
    const {
      filePath,
      targetTableName,
      sheetName,
      uniqueKeys,
      columnMapping,
      tempFilePath,
    } = params

    console.log('[FileService] ingestPreCheck', {
      ...params,
      tempFilePath: tempFilePath ? 'PROVIDED' : 'NONE',
    })

    const ext = extname(filePath).toLowerCase()

    const safePath = filePath.replace(/\\/g, '/')

    let sourceSql = ''

    let tempTableToDrop: string | undefined

    let tempFileToDrop: string | undefined // Only set if WE created it

    try {
      if (ext === '.csv') {
        sourceSql = `read_csv_auto('${safePath}', SAMPLE_SIZE=-1, auto_detect=true)`
      } else if (ext === '.json') {
        sourceSql = `read_json_auto('${safePath}', format='auto', auto_detect=true)`
      } else if (ext === '.xlsx' || ext === '.xls') {
        if (tempFilePath && (await fs.pathExists(tempFilePath))) {
          // CACHE HIT: Use existing CSV

          const safeTempPath = tempFilePath.replace(/\\/g, '/')

          sourceSql = `read_csv_auto('${safeTempPath}', HEADER=TRUE, SAMPLE_SIZE=-1, auto_detect=true)`
        } else {
          // CACHE MISS: Convert

          console.log(
            '[FileService] Cache miss for Excel pre-check, converting...'
          )

          const fileName = basename(filePath)

          const tempPrefix = `precheck_${Date.now()}_`

          const schemas = await ingestExcelFile(
            filePath,

            this.databaseService,

            fileName,

            undefined,

            sheetName,

            undefined,

            tempPrefix
          )

          if (schemas.length === 0)
            throw new Error('No sheet found for pre-check')

          const targetSheet = sheetName
            ? schemas.find(
                s =>
                  s.description.endsWith(sheetName) ||
                  s.tableName.includes(sheetName)
              )
            : schemas[0]

          sourceSql = `"${targetSheet?.tableName || schemas[0].tableName}"`

          tempTableToDrop = targetSheet?.tableName || schemas[0].tableName

          tempFileToDrop = targetSheet?.tempFilePath || schemas[0].tempFilePath
        }
      } else {
        throw new Error(`Unsupported file type: ${ext}`)
      }

      // Get target columns to validate keys

      const targetCols = (
        await this.databaseService.query(
          `PRAGMA table_info('${targetTableName}')`
        )
      ).map((c: any) => c.name)
      const targetSet = new Set(targetCols)

      let duplicateRows = 0
      let totalRows = 0

      // Get Total Rows
      const countRes = await this.databaseService.query(
        `SELECT COUNT(*) as count FROM ${sourceSql}`
      )
      totalRows = Number(countRes[0].count)

      if (uniqueKeys && uniqueKeys.length > 0) {
        // Filter unique keys that are actually mapped to source columns
        // We assume source columns exist if mapped.
        const validKeys = uniqueKeys.filter(
          k => targetSet.has(k) && columnMapping[k]
        )

        if (validKeys.length > 0) {
          const joinConditions = validKeys
            .map(k => {
              const sourceCol = columnMapping[k]
              // t1 is Source (File), t2 is Target (DB)
              return `t1."${sourceCol}" = t2."${k}"`
            })
            .join(' AND ')

          const dupRes = await this.databaseService.query(`
            SELECT COUNT(*) as count 
            FROM ${sourceSql} AS t1 
            JOIN "${targetTableName}" AS t2 ON ${joinConditions}
          `)
          duplicateRows = Number(dupRes[0].count)
        }
      }

      return {
        totalRows,
        duplicateRows,
        columnMatch: {
          matched: [], // Simplified for now as full match logic is complex without schema
          missing: [],
          extra: [],
        },
      }
    } finally {
      if (tempTableToDrop) {
        await this.databaseService.exec(
          `DROP TABLE IF EXISTS "${tempTableToDrop}"`
        )
      }
      if (tempFileToDrop && (await fs.pathExists(tempFileToDrop))) {
        await fs.remove(tempFileToDrop)
      }
    }
  }

  async appendData(params: AppendDataParams): Promise<{ rowCount: number }> {
    const {
      filePath,
      targetTableName,
      sheetName,
      uniqueKeys,
      strategy,
      columnMapping,
      tempFilePath,
    } = params
    console.log('[FileService] appendData', {
      ...params,
      tempFilePath: tempFilePath ? 'PROVIDED' : 'NONE',
    })

    const ext = extname(filePath).toLowerCase()
    const safePath = filePath.replace(/\\/g, '/')
    let sourceSql = ''
    let tempTableToDrop: string | undefined
    let tempFileToDrop: string | undefined

    try {
      // 1. Prepare Source SQL
      if (ext === '.csv') {
        sourceSql = `read_csv_auto('${safePath}', SAMPLE_SIZE=-1, auto_detect=true)`
      } else if (ext === '.json') {
        sourceSql = `read_json_auto('${safePath}', format='auto', auto_detect=true)`
      } else if (ext === '.xlsx' || ext === '.xls') {
        if (tempFilePath && (await fs.pathExists(tempFilePath))) {
          // CACHE HIT
          const safeTempPath = tempFilePath.replace(/\\/g, '/')
          sourceSql = `read_csv_auto('${safeTempPath}', HEADER=TRUE, SAMPLE_SIZE=-1, auto_detect=true)`
        } else {
          // CACHE MISS
          // Excel needs conversion
          const fileName = basename(filePath)
          const tempPrefix = `append_${Date.now()}_`
          const schemas = await ingestExcelFile(
            filePath,
            this.databaseService,
            fileName,
            undefined,
            sheetName,
            undefined,
            tempPrefix
          )
          if (schemas.length === 0) throw new Error('Source sheet not found')
          const targetSheet = sheetName
            ? schemas.find(
                s =>
                  s.description.endsWith(sheetName) ||
                  s.tableName.includes(sheetName)
              )
            : schemas[0]

          sourceSql = `"${targetSheet?.tableName || schemas[0].tableName}"`
          tempTableToDrop = targetSheet?.tableName || schemas[0].tableName
          tempFileToDrop = targetSheet?.tempFilePath || schemas[0].tempFilePath
        }
      } else {
        throw new Error(`Unsupported file type: ${ext}`)
      }

      // 2. Build SELECT clause from mapping
      const mappedSelects: string[] = []
      const targetCols: string[] = []

      for (const [targetCol, sourceCol] of Object.entries(columnMapping)) {
        if (sourceCol) {
          mappedSelects.push(`"${sourceCol}" AS "${targetCol}"`)
          targetCols.push(targetCol) // Keep raw name here
        }
      }

      if (targetCols.length === 0) throw new Error('No columns were mapped.')

      const selectClause = mappedSelects.join(' , ')
      const colList = targetCols.map(c => `"${c}"`).join(' , ') // Quote here once
      // 3. Execute Merge Strategy
      if (uniqueKeys && uniqueKeys.length > 0) {
        // Validate keys are mapped
        const pkTargetSourceMap = uniqueKeys.map(k => {
          const mappedSourceKey = columnMapping[k]
          if (!mappedSourceKey)
            throw new Error(`Primary Key '${k}' not mapped in source.`)
          return { target: k, source: mappedSourceKey }
        })

        if (strategy === 'replace') {
          // DELETE then INSERT
          // Note: Subquery uses sourceSql (file read)
          const deleteJoinConditions = pkTargetSourceMap
            .map(m => `"${targetTableName}"."${m.target}" = src."${m.source}"`)
            .join(' AND ')

          // Delete rows that exist in the NEW file
          await this.databaseService.exec(`
              DELETE FROM "${targetTableName}" 
              WHERE EXISTS (
                SELECT 1 FROM ${sourceSql} AS src
                WHERE ${deleteJoinConditions}
              )
            `)

          await this.databaseService.exec(`
              INSERT INTO "${targetTableName}" (${colList})
              SELECT ${selectClause} FROM ${sourceSql}
            `)
        } else {
          // ignore
          // INSERT WHERE NOT EXISTS
          const insertWhereNotExistsConditions = pkTargetSourceMap
            .map(m => `tgt."${m.target}" = src."${m.source}"`)
            .join(' AND ')

          await this.databaseService.exec(`
              INSERT INTO "${targetTableName}" (${colList})
              SELECT ${selectClause} 
              FROM ${sourceSql} AS src
              WHERE NOT EXISTS (
                SELECT 1 FROM "${targetTableName}" AS tgt 
                WHERE ${insertWhereNotExistsConditions}
              )
            `)
        }
      } else {
        // No unique key: simple bulk insert
        await this.databaseService.exec(`
            INSERT INTO "${targetTableName}" (${colList})
            SELECT ${selectClause} FROM ${sourceSql}
          `)
      }

      const countRes = await this.databaseService.query(
        `SELECT COUNT(*) as count FROM "${targetTableName}"`
      )
      return { rowCount: Number(countRes[0].count) }
    } finally {
      if (tempTableToDrop) {
        await this.databaseService.exec(
          `DROP TABLE IF EXISTS "${tempTableToDrop}"`
        )
      }
      if (tempFileToDrop && (await fs.pathExists(tempFileToDrop))) {
        await fs.remove(tempFileToDrop)
      }
    }
  }
}
