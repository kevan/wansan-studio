import { FileNode } from '@shared/types'
import { Relation } from '@shared/types/project'
import { getJoinedColumnName } from '@shared/naming-utils'

/**
 * Escapes regex special characters.
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\\]/g, '\\$&')
}

export const DuckDBViewManager = {
  /**
   * Rebuilds the "Wide View" (v_{tableName}) for a given file.
   * Strategy:
   * 1. Eagerly LEFT JOIN all defined relations.
   * 2. Use FK column name as prefix for joined columns.
   * 3. Resolve Ambiguity: Automatically map user columns to physical paths (T1."col", T_n."col").
   * 4. Introspect types for metrics.
   */
  rebuildView: async (
    file: FileNode,
    allFiles: FileNode[],
    relations: Relation[]
  ): Promise<Map<string, string>> => {
    const tableName = file.tableName
    const viewName = `v_${tableName}`

    // 1. Setup Base Map
    const colMap = new Map<string, string>()
    file.columns.forEach(col => {
      colMap.set(col.name, `T1."${col.name}" `)
    })

    // 2. Identify Relations & Build Joins
    const activeRelations = relations.filter(r => r.fileAId === file.id)
    const selectClauses: string[] = [`T1.*`] // Keep all native columns
    const joinClauses: string[] = []

    activeRelations.forEach((rel, index) => {
      const targetFile = allFiles.find(f => f.id === rel.fileBId)
      if (!targetFile) return

      const alias = `T_${index + 2}` // T1 is base
      const prefix = rel.columnA // Naming: product_id__category

      // JOIN Logic
      joinClauses.push(
        `LEFT JOIN "${targetFile.tableName}" AS ${alias} ON T1."${rel.columnA}" = ${alias}."${rel.columnB}"`
      )

      // SELECT Dimension Columns & Fill ColMap
      targetFile.columns.forEach(col => {
        const userColName = `${prefix}__${col.name}`
        const physicalPath = `${alias}."${col.name}"`
        selectClauses.push(`${physicalPath} AS "${userColName}" `)
        colMap.set(userColName, physicalPath)
      })
    })

    // 3. Resolve & Add Metrics
    if (file.smartMetrics && file.smartMetrics.length > 0) {
      // Sort keys by length descending to prevent partial replacements (e.g. "tax_rate" before "tax")
      const sortedUserCols = Array.from(colMap.keys()).sort(
        (a, b) => b.length - a.length
      )

      file.smartMetrics.forEach(metric => {
        let resolvedExpr = metric.sqlExpression

        sortedUserCols.forEach(userCol => {
          const physicalPath = colMap.get(userCol)!
          // [FIX] Matches optional surrounding quotes (e.g. "col" or col) to prevent "T1."col"" syntax
          const regex = new RegExp(`"?\\b${escapeRegExp(userCol)}\\b"?`, 'g')
          resolvedExpr = resolvedExpr.replace(regex, physicalPath)
        })

        selectClauses.push(`(${resolvedExpr}) AS "${metric.name}" `)
      })
    }

    // 4. Create View
    const sql = `
      CREATE OR REPLACE VIEW "${viewName}" AS
      SELECT
        ${selectClauses.join(',\n        ')}
      FROM "${tableName}" AS T1
      ${joinClauses.join('\n      ')}
    `

    console.log('[DuckDBViewManager] Rebuilding View:', viewName)

    try {
      // Execute via IPC
      await window.electronAPI.runSQL(sql)
      // Introspect Types using DESCRIBE
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
}
