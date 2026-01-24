import fs from 'fs-extra'
import { basename, extname } from 'path'
import { NativeDatabaseService } from './native-db-service'
import { TempFileManager } from '../utils/temp-manager'
import {
  getSampleValues,
  ingestExcelFile,
  ingestJsonData,
} from '../engine/ingestion'
import { DEMO_DATA } from '@shared/demo-data.ts'
import { ColumnSchema, ColumnType, ReloadResult } from '@shared/types.ts'
import { normalizeDuckDBType } from '@shared/type-utils.ts'
import {
  AppendDataParams,
  CreateTableParams,
  IngestPreCheckParams,
  IngestPreCheckResponse,
} from '@shared/electron-api.ts'

export class FileService {
  constructor(private databaseService: NativeDatabaseService) {}

  // [Stage 1] Ultra-Lightweight Inspection: Task Generation ONLY
  async inspectFile(filePath: string): Promise<Array<{ 
    sourceName: string
  }>> {
    const ext = extname(filePath).toLowerCase()
    
    // Branch A: Excel (XLSX/XLS) -> Use Worker to expand sheets
    if (ext === '.xlsx' || ext === '.xls') {
      return await ingestExcelFile(filePath, this.databaseService, basename(filePath), undefined, undefined, undefined, 't_', undefined, undefined, 'inspect')
    } 
    
    // Branch B: Flat Files (CSV, JSON, Parquet) -> Identity
    if (['.csv', '.json', '.parquet'].includes(ext)) {
      return [{ sourceName: basename(filePath) }]
    }
    
    throw new Error(`Unsupported file type: ${ext}`)
  }

  // [Stage 2] Staging: Data Loading, Encoding Detection, Temp Table Creation
  async prepareFile(filePath: string, sourceName: string, _readOptions?: Record<string, any>): Promise<{
    tempFilePath: string
    rowCount: number
    columns: ColumnSchema[]
    preview: any[]
    readOptions?: Record<string, any>
  }> {
     const ext = extname(filePath).toLowerCase()
     const fileName = basename(filePath)
     const safePath = filePath.replace(/\\/g, '/')

     // Branch A: Excel -> Convert to CSV via Worker
     if (ext === '.xlsx' || ext === '.xls') {
        const schemas = await ingestExcelFile(filePath, this.databaseService, fileName, undefined, sourceName, undefined, 'temp_stage_')
        if (schemas.length === 0) throw new Error(`Sheet ${sourceName} not found`)
        const schema = schemas[0]
        const preview = await this.databaseService.query(`SELECT * FROM "${schema.tableName}" LIMIT 100`)
        const countRes = await this.databaseService.query(`SELECT COUNT(*) as count FROM "${schema.tableName}" `)
        return { 
          tempFilePath: schema.tempFilePath || '', 
          rowCount: Number(countRes[0].count), 
          columns: schema.columns, 
          preview,
          readOptions: undefined 
        }
     } 
     
     // Branch B: Flat Files -> DuckDB Direct Read + Encoding Detection
     let reader = 'read_csv_auto'
     let detectedOptions: Record<string, any> | undefined = undefined

     if (ext === '.json') { 
       reader = 'read_json_auto'
       const opts = "format='auto', auto_detect=true"
       try {
         await this.databaseService.query(`DESCRIBE SELECT * FROM ${reader}('${safePath}', ${opts})`)
         detectedOptions = { format: 'auto', auto_detect: true }
       } catch (e) { throw new Error('Invalid JSON file') }
     }
     else if (ext === '.parquet') { 
       reader = 'read_parquet'
     }
     else if (ext === '.csv') {
       // [Auto-Detect Encoding]
       const strategies = [
          { name: 'Default', options: { auto_detect: true } },
          { name: 'GBK', options: { encoding: 'GBK', auto_detect: true } },
          { name: 'GB18030', options: { encoding: 'GB18030', auto_detect: true } },
          { name: 'IgnoreErrors', options: { ignore_errors: true, auto_detect: true } },
       ]

       let lastError: any
       let winningStrategy = null

       for (const strategy of strategies) {
         try {
           const optStr = Object.entries(strategy.options).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`).join(', ')
           const sql = `DESCRIBE SELECT * FROM read_csv_auto('${safePath}', ${optStr})`
           await this.databaseService.query(sql)
           winningStrategy = strategy
           break
         } catch (e) { lastError = e }
       }

       if (!winningStrategy) throw new Error(`Failed to parse CSV: ${lastError?.message}`)
       detectedOptions = winningStrategy.options
     }

     // Final Read
     let optionsStr = ''
     if (detectedOptions) {
       optionsStr = ', ' + Object.entries(detectedOptions).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`).join(', ')
     } else if (reader === 'read_json_auto') {
       optionsStr = ", format='auto', auto_detect=true"
     } else if (reader === 'read_csv_auto') {
       optionsStr = ", auto_detect=true"
     }

     const readSql = `${reader}('${safePath}'${optionsStr})`
     
     const preview = await this.databaseService.query(`SELECT * FROM ${readSql} LIMIT 100`)
     const columnsResult = await this.databaseService.query(`DESCRIBE SELECT * FROM ${readSql}`)
     const countResult = await this.databaseService.query(`SELECT COUNT(*) as count FROM ${readSql}`)
     
     const columns: ColumnSchema[] = columnsResult.map((col: any) => ({
       name: col.column_name,
       safeName: col.column_name,
       type: normalizeDuckDBType(col.column_type) as ColumnType,
       sampleValues: [] 
     }))

     return { 
       tempFilePath: filePath, 
       rowCount: Number(countResult[0].count), 
       columns, 
       preview,
       readOptions: detectedOptions 
     }
  }

  // Legacy parseFile (keep for safety)
  async parseFile(filePath: string, onProgress?: (info: any) => void) {
    const res = await this.prepareFile(filePath, basename(filePath))
    return [{ tableName: '', schema: { tableName: '', description: basename(filePath), columns: res.columns }, rowCount: res.rowCount, preview: res.preview }]
  }

  async validateColumnTypes(params: any): Promise<{ valid: boolean; error?: string; errorDetail?: any }> {
    const { filePath, tempFilePath, sourceTableName, columns, readOptions } = params
    let readSql = ''
    if (sourceTableName) readSql = `"${sourceTableName}"`
    else {
      const targetPath = (tempFilePath && fs.existsSync(tempFilePath)) ? tempFilePath : filePath
      const ext = extname(targetPath).toLowerCase()
      const safePath = targetPath.replace(/\\/g, '/')
      const extraOptions = readOptions ? ', ' + Object.entries(readOptions).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`).join(', ') : ''
      if (ext === '.csv') readSql = `read_csv_auto('${safePath}', auto_detect=true${extraOptions})`
      else if (ext === '.json') readSql = `read_json_auto('${safePath}', format='auto', auto_detect=true)`
      else if (ext === '.parquet') readSql = `read_parquet('${safePath}')`
      else return { valid: false, error: `Unsupported validation for ${ext}` }
    }
    for (const col of columns) {
      try { await this.databaseService.query(`SELECT CAST("${col.name}" AS ${col.type}) FROM ${readSql} LIMIT 50000`) } 
      catch (e: any) { return { valid: false, error: e.message, errorDetail: { column: col.name, type: col.type, value: '?' } } }
    }
    return { valid: true }
  }

  async reIngestFile(
    filePath: string, 
    tableName: string, 
    sheetName?: string, 
    _onProgress?: any, 
    knownColumns?: ColumnSchema[],
    readOptions?: Record<string, any>
  ): Promise<ReloadResult> {
    if (filePath === 'DEMO_MEMORY') {
      const result = await ingestJsonData(this.databaseService, tableName, DEMO_DATA)
      return { lastModified: Date.now(), newColumns: result.columns }
    }
    const ext = extname(filePath).toLowerCase()
    const stats = await fs.stat(filePath)
    let columns: ColumnSchema[] = []
    
    // [FIX] DuckDB uses 'types' for CSV but 'columns' for JSON
    const paramName = ext === '.json' ? 'columns' : 'types'
    const typesParam = knownColumns ? `${paramName}={${knownColumns.map(c => `'${c.name}': '${c.type}'`).join(', ')}}` : ''

    if (ext === '.xlsx' || ext === '.xls') {
      const schemas = await ingestExcelFile(filePath, this.databaseService, basename(filePath), tableName, sheetName, _onProgress, 't_', typesParam)
      return { lastModified: stats.mtimeMs, newColumns: schemas[0]?.columns || [] }
    } else {
      await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}"`) 
      const safePath = filePath.replace(/\\/g, '/')
      const reader = ext === '.json' ? 'read_json_auto' : (ext === '.parquet' ? 'read_parquet' : 'read_csv_auto')
      const extraOptions = (ext === '.csv' && readOptions) ? ', ' + Object.entries(readOptions).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`).join(', ') : ''
      const opts = ext === '.csv' ? `auto_detect=true${extraOptions}` : (ext === '.json' ? "format='auto', auto_detect=true" : '')
      
      const loadSql = `${reader}('${safePath}'${typesParam ? ', ' + typesParam : ''}${opts ? ', ' + opts : ''})`
      
      await this.databaseService.exec(`CREATE TABLE "${tableName}" AS SELECT * FROM ${loadSql}`)
      const columnsResult = await this.databaseService.query(`PRAGMA table_info('${tableName}');`)
      const finalCols = await Promise.all(columnsResult.map(async (col: any) => {
        const type = normalizeDuckDBType(col.type)
        return { name: col.name, safeName: col.name, type: type as ColumnType, sampleValues: await getSampleValues(this.databaseService, tableName, col.name, type as ColumnType) }
      }))
      return { lastModified: stats.mtimeMs, newColumns: finalCols }
    }
  }

  async createTableFromSource(params: CreateTableParams): Promise<any> {
    const { filePath, tableName, sourceTableName, columns, tempFilePath, readOptions } = params
    const ext = extname(filePath).toLowerCase()
    const activeCols = columns.filter(c => !c.isIgnored)
    if (activeCols.length === 0) throw new Error('No columns selected')
    const typesSql = activeCols.map(c => `'${c.name}': '${c.type}'`).join(', ')
    
    // [FIX] DuckDB uses 'types' for CSV but 'columns' for JSON
    const paramName = ext === '.json' ? 'columns' : 'types'
    const typesParam = `${paramName}={${typesSql}}`
    
    const limit = params.limitRows ? ` LIMIT ${params.limitRows}` : ''

    await this.databaseService.exec(`DROP TABLE IF EXISTS "${tableName}" `)
    if (sourceTableName) {
      const casted = activeCols.map(c => `CAST("${c.name}" AS ${c.type}) AS "${c.name}"`).join(', ')
      await this.databaseService.exec(`CREATE TABLE "${tableName}" AS SELECT ${casted} FROM "${sourceTableName}"${limit}`)
    } else {
      let reader = 'read_csv_auto'
      if (ext === '.json') reader = 'read_json_auto'
      else if (ext === '.parquet') reader = 'read_parquet'
      const target = (tempFilePath && await fs.pathExists(tempFilePath)) ? tempFilePath : filePath
      const safeTarget = target.replace(/\\/g, '/')
      const colList = activeCols.map(c => `"${c.name}"`).join(', ')
      const extraOptions = (ext === '.csv' && readOptions) ? ', ' + Object.entries(readOptions).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`).join(', ') : ''
      const loadOptions = ext === '.parquet' ? '' : `, ${typesParam}${extraOptions}`
      await this.databaseService.exec(`CREATE TABLE "${tableName}" AS SELECT ${colList} FROM ${reader}('${safeTarget}'${loadOptions})${limit}`)
    }
    const count = await this.databaseService.query(`SELECT COUNT(*) as count FROM "${tableName}" `)
    const cols = await this.databaseService.query(`PRAGMA table_info('${tableName}')`)
    const finalCols = await Promise.all(cols.map(async (c: any) => {
      const type = normalizeDuckDBType(c.type)
      return { name: c.name, safeName: c.name, type: type as ColumnType, sampleValues: await getSampleValues(this.databaseService, tableName, c.name, type as ColumnType) }
    }))
    return { rowCount: Number(count[0].count), columns: finalCols }
  }

  async cleanupStaging(tables: string[], files?: string[]) {
    for (const t of tables) if (t) await this.databaseService.exec(`DROP TABLE IF EXISTS "${t}" `)
    if (files) for (const f of files) if (f && await fs.pathExists(f)) await fs.remove(f)
  }

  async cleanupAllStaging() {
    const tables = await this.databaseService.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'temp_ingest_%' OR table_name LIKE 'temp_stage_%' `)
    for (const t of tables) await this.databaseService.exec(`DROP TABLE IF EXISTS "${(t as any).table_name}" `)
    await TempFileManager.cleanupOldFiles()
  }

  async cleanupTempFiles() { await TempFileManager.cleanupOldFiles() }

  async ingestPreCheck(params: IngestPreCheckParams): Promise<IngestPreCheckResponse> {
    const { filePath, targetTableName, sourceTableName, uniqueKeys, columnMapping, tempFilePath, readOptions } = params
    const ext = extname(filePath).toLowerCase()
    let sourceSql = ''
    if (sourceTableName) sourceSql = `"${sourceTableName}"`
    else {
      let reader = 'read_csv_auto'
      if (ext === '.json') reader = 'read_json_auto'
      else if (ext === '.parquet') reader = 'read_parquet'
      const target = (tempFilePath && await fs.pathExists(tempFilePath)) ? tempFilePath : filePath
      const safeTarget = target.replace(/\\/g, '/')
      const extraOptions = (ext === '.csv' && readOptions) ? ', ' + Object.entries(readOptions).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`).join(', ') : ''
      const opts = ext === '.csv' ? `auto_detect=true${extraOptions}` : (ext === '.json' ? "format='auto', auto_detect=true" : '')
      
      sourceSql = `${reader}('${safeTarget}'${opts ? ', ' + opts : ''})`
    }
    const count = await this.databaseService.query(`SELECT COUNT(*) as count FROM ${sourceSql}`)
    let dups = 0
    if (uniqueKeys && uniqueKeys.length > 0) {
      const join = uniqueKeys.map(k => `t1."${columnMapping[k]}" = t2."${k}"`).join(' AND ')
      const res = await this.databaseService.query(`SELECT COUNT(*) as count FROM ${sourceSql} AS t1 JOIN "${targetTableName}" AS t2 ON ${join}`)
      dups = Number(res[0].count)
    }
    return { totalRows: Number(count[0].count), duplicateRows: dups, columnMatch: { matched: [], missing: [], extra: [] } }
  }

  async appendData(params: AppendDataParams): Promise<{ rowCount: number }> {
    const { filePath, targetTableName, sourceTableName, uniqueKeys, strategy, columnMapping, tempFilePath, readOptions } = params
    const ext = extname(filePath).toLowerCase()
    let sourceSql = ''
    if (sourceTableName) sourceSql = `"${sourceTableName}"`
    else {
      let reader = 'read_csv_auto'
      if (ext === '.json') reader = 'read_json_auto'
      else if (ext === '.parquet') reader = 'read_parquet'
      const target = (tempFilePath && await fs.pathExists(tempFilePath)) ? tempFilePath : filePath
      const safeTarget = target.replace(/\\/g, '/')
      const extraOptions = (ext === '.csv' && readOptions) ? ', ' + Object.entries(readOptions).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`).join(', ') : ''
      const opts = ext === '.csv' ? `auto_detect=true${extraOptions}` : (ext === '.json' ? "format='auto', auto_detect=true" : '')
      
      sourceSql = `${reader}('${safeTarget}'${opts ? ', ' + opts : ''})`
    }
    const selects = Object.entries(columnMapping).filter(([_, s]) => !!s).map(([t, s]) => `"${s}" AS "${t}"`).join(' , ')
    const targetCols = Object.entries(columnMapping).filter(([_, s]) => !!s).map(([t, _]) => `"${t}"`).join(' , ')
    if (uniqueKeys && uniqueKeys.length > 0) {
      if (strategy === 'replace') {
        const join = uniqueKeys.map(k => `"${targetTableName}"."${k}" = src."${columnMapping[k]}"`).join(' AND ')
        await this.databaseService.exec(`DELETE FROM "${targetTableName}" WHERE EXISTS (SELECT 1 FROM ${sourceSql} AS src WHERE ${join})`)
        await this.databaseService.exec(`INSERT INTO "${targetTableName}" (${targetCols}) SELECT ${selects} FROM ${sourceSql}`)
      } else if (strategy === 'update') {
        const set = Object.keys(columnMapping).filter(k => !uniqueKeys.includes(k) && columnMapping[k]).map(k => `"${k}" = src."${columnMapping[k]}"`).join(' , ')
        const where = uniqueKeys.map(k => `"${targetTableName}"."${k}" = src."${columnMapping[k]}"`).join(' AND ')
        await this.databaseService.exec(`UPDATE "${targetTableName}" SET ${set} FROM ${sourceSql} AS src WHERE ${where}`)
      } else {
        const notEx = uniqueKeys.map(k => `tgt."${k}" = src."${columnMapping[k]}"`).join(' AND ')
        await this.databaseService.exec(`INSERT INTO "${targetTableName}" (${targetCols}) SELECT ${selects} FROM ${sourceSql} AS src WHERE NOT EXISTS (SELECT 1 FROM "${targetTableName}" AS tgt WHERE ${notEx})`)
      }
    } else await this.databaseService.exec(`INSERT INTO "${targetTableName}" (${targetCols}) SELECT ${selects} FROM ${sourceSql}`)
    const count = await this.databaseService.query(`SELECT COUNT(*) as count FROM "${targetTableName}" `)
    return { rowCount: Number(count[0].count) }
  }
}