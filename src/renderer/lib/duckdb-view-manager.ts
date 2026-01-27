import { ColumnSchema, ColumnType, FileNode } from '@shared/types'
import { Relation } from '@shared/types/project'
import { getJoinedColumnName } from '@shared/naming-utils'
import { normalizeDuckDBType } from '@shared/type-utils.ts'

/**
 * Escapes regex special characters.
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\\]/g, '\\$&')
}

/**
 * Internal helper to build column mappings and JOIN clauses.
 */
function prepareViewContext(
  file: FileNode,
  allFiles: FileNode[],
  relations: Relation[]
) {
  const colMap = new Map<string, string>()
  const selectDimensionClauses: string[] = []
  const joinClauses: string[] = []

  // 1. Map Native Columns
  file.columns.forEach(col => {
    colMap.set(col.name, `T1."${col.name}" `)
  })

  // 2. Identify Relations & Build Joins
  const activeRelations = relations.filter(r => r.fileAId === file.id)

  activeRelations.forEach((rel, index) => {
    const targetFile = allFiles.find(f => f.id === rel.fileBId)
    if (!targetFile) return

    const alias = `T_${index + 2}` // T1 is base
    const prefix = rel.columnA

    joinClauses.push(
      `LEFT JOIN "${targetFile.tableName}" AS ${alias} ON T1."${rel.columnA}" = ${alias}."${rel.columnB}"`
    )

    targetFile.columns.forEach(col => {
      const userColName = getJoinedColumnName(prefix, col.name)
      const physicalPath = `${alias}."${col.name}"`
      selectDimensionClauses.push(`${physicalPath} AS "${userColName}" `)
      colMap.set(userColName, physicalPath)
    })
  })

  return { colMap, selectDimensionClauses, joinClauses }
}

/**
 * Resolves a user-friendly SQL expression into a physical one using table aliases.
 */
function resolveExpression(expression: string, colMap: Map<string, string>) {
  let resolvedExpr = expression
  const sortedUserCols = Array.from(colMap.keys()).sort(
    (a, b) => b.length - a.length
  )

  sortedUserCols.forEach(userCol => {
    const physicalPath = colMap.get(userCol)!
    // Match the column name either quoted or unquoted as a whole word
    const escaped = escapeRegExp(userCol)
    const regex = new RegExp(`("${escaped}")|(\b${escaped}\b)`, 'g')
    resolvedExpr = resolvedExpr.replace(regex, physicalPath)
  })

  return resolvedExpr
}

export const DuckDBViewManager = {
  /**
   * Rebuilds the "Wide View" (v_{tableName}) for a given file.
   * Returns the full schema of the view (Columns + Types).
   */
  rebuildView: async (
    file: FileNode,
    allFiles: FileNode[],
    relations: Relation[]
  ): Promise<ColumnSchema[]> => {
    const { colMap, selectDimensionClauses, joinClauses } = prepareViewContext(
      file,
      allFiles,
      relations
    )

    // [V1.7] Check for Sidecar (AI Augmentation)
    const sidecarName = `${file.tableName}_ext_ai`
    const sidecarSelects: string[] = []
    try {
      const sidecarExistsRes = await window.electronAPI.runSQL(
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${sidecarName}'`
      )
      if (sidecarExistsRes.success && sidecarExistsRes.data && sidecarExistsRes.data.data.length > 0) {
        // Fetch Sidecar Columns
        const sidecarColsRes = await window.electronAPI.runSQL(`PRAGMA table_info('${sidecarName}')`)
        if (sidecarColsRes.success && sidecarColsRes.data) {
          const sidecarCols = sidecarColsRes.data.data
            .filter((c: any) => c.column_name !== '_ws_row_id') // Use column_name for PRAGMA result
            .map((c: any) => c.column_name)
          
          joinClauses.push(`LEFT JOIN "${sidecarName}" AS T_AI ON T1._ws_row_id = T_AI._ws_row_id`)
          
          sidecarCols.forEach((colName: string) => {
            sidecarSelects.push(`T_AI."${colName}" `)
            colMap.set(colName, `T_AI."${colName}" `)
          })
        }
      }
    } catch (e) {
      console.warn(`[DuckDBViewManager] Failed to check sidecar for ${file.tableName}:`, e)
    }

    const selectClauses = [`T1.*`, ...sidecarSelects, ...selectDimensionClauses]

    // Add Smart Metrics
    if (file.smartMetrics && file.smartMetrics.length > 0) {
      file.smartMetrics.forEach(metric => {
        const resolvedExpr = resolveExpression(metric.sqlExpression, colMap)
        selectClauses.push(`(${resolvedExpr}) AS "${metric.name}" `)
      })
    }

    // [V1.7] Smart Time Intelligence
    // If a column is a date/timestamp, and we have a numeric column, generate YoY/MoM hints
    const timeCol = file.columns.find(c => ['TIMESTAMP', 'DATE'].includes(c.type))
    const numericCols = file.columns.filter(c => ['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(c.type))
    
    if (timeCol && numericCols.length > 0) {
      numericCols.slice(0, 2).forEach(numCol => {
        // MoM (Growth Rate)
        const momExpr = `("${numCol.name}" - LAG("${numCol.name}") OVER (ORDER BY "${timeCol.name}")) / NULLIF(LAG("${numCol.name}") OVER (ORDER BY "${timeCol.name}"), 0)`
        selectClauses.push(`(${momExpr}) AS "${numCol.name}_MoM"`)
      })
    }

    const viewName = `v_${file.tableName}`
    const sql = `
      CREATE OR REPLACE VIEW "${viewName}" AS
      SELECT
        ${selectClauses.join(',\n        ')}
      FROM "${file.tableName}" AS T1
      ${joinClauses.join('\n      ')}
    `

    try {
      await window.electronAPI.runSQL(sql)
      const descRes = await window.electronAPI.runSQL(`DESCRIBE "${viewName}" `)
      
      const viewColumns: ColumnSchema[] = []

      if (descRes.success && descRes.data) {
        descRes.data.data.forEach((row: any) => {
          viewColumns.push({
            name: row.column_name,
            safeName: row.column_name,
            type: normalizeDuckDBType(row.column_type),
            sampleValues: [] // View schema doesn't need samples, base columns have them
          })
        })
      }
      return viewColumns
    } catch (e) {
      console.error('[DuckDBViewManager] Rebuild failed:', e)
      throw e
    }
  },

  /**
   * Tests a single metric expression using the same JOIN and resolution rules.
   */
  testMetricExpression: async (
    file: FileNode,
    expression: string,
    allFiles: FileNode[],
    relations: Relation[]
  ): Promise<{ value: any; dataType: ColumnType }> => {
    const { colMap, joinClauses } = prepareViewContext(
      file,
      allFiles,
      relations
    )
    const resolvedExpr = resolveExpression(expression, colMap)

    const testSql = `
      SELECT (${resolvedExpr}) AS test_result
      FROM "${file.tableName}" AS T1
      ${joinClauses.join('\n      ')}
      LIMIT 1
    `

    const res = await window.electronAPI.runSQL(testSql)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Test query failed')
    }

    const row = res.data.data[0]
    const val = row ? row.test_result : null
    const type =
      res.data.columnFields.find(f => f.name === 'test_result')?.type ||
      'UNKNOWN'

    return {
      value: val,
      dataType: normalizeDuckDBType(type),
    }
  },
}
