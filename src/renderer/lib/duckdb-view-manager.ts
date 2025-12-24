import { FileNode } from '@shared/types'
import { Relation } from '@shared/types/project'
import { getJoinedColumnName } from '@shared/naming-utils'

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
    const regex = new RegExp(`"?\\b${escapeRegExp(userCol)}\\b"?`, 'g')
    resolvedExpr = resolvedExpr.replace(regex, physicalPath)
  })

  return resolvedExpr
}

export const DuckDBViewManager = {
  /**
   * Rebuilds the "Wide View" (v_{tableName}) for a given file.
   */
  rebuildView: async (
    file: FileNode,
    allFiles: FileNode[],
    relations: Relation[]
  ): Promise<Map<string, string>> => {
    // ONLY build view if smartMetrics are configured
    if (!file.smartMetrics || file.smartMetrics.length === 0) {
      // If no smart metrics, drop the view if it exists and return empty map
      try {
        await window.electronAPI.runSQL(`DROP VIEW IF EXISTS "v_${file.tableName}"`)
      } catch (e) {
        console.warn(`[DuckDBViewManager] Failed to drop view v_${file.tableName}:`, e)
      }
      return new Map<string, string>();
    }

    const { colMap, selectDimensionClauses, joinClauses } = prepareViewContext(
      file,
      allFiles,
      relations
    )

    const selectClauses = [`T1.*`, ...selectDimensionClauses]

    // Add Smart Metrics
    if (file.smartMetrics && file.smartMetrics.length > 0) {
      file.smartMetrics.forEach(metric => {
        const resolvedExpr = resolveExpression(metric.sqlExpression, colMap)
        selectClauses.push(`(${resolvedExpr}) AS "${metric.name}" `)
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
      const typeMap = new Map<string, string>()

      if (descRes.success && descRes.data) {
        descRes.data.data.forEach((row: any) => {
          typeMap.set(row.column_name, row.column_type)
        })
      }
      return typeMap
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
  ): Promise<{ value: any; dataType: string }> => {
    const { colMap, joinClauses } = prepareViewContext(file, allFiles, relations)
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
    const type = res.data.columnFields.find(f => f.name === 'test_result')?.type || 'UNKNOWN'

    return {
      value: val,
      dataType: type,
    }
  },
}