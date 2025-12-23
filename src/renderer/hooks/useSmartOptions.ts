import { useState, useEffect } from 'react'
import { useProjectStore } from '../stores/useProjectStore'

export interface SmartOption {
  value: any
  [key: string]: any
}

export function useSmartOptions(
  table: string,
  column: string,
  displayColumns: string[] = [],
  searchTerm: string = ''
) {
  const [options, setOptions] = useState<SmartOption[]>([])
  const [loading, setLoading] = useState(false)
  const files = useProjectStore((s) => s.files)

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      if (!table || !column) {
        if (active) setOptions([])
        return
      }

      // 1. Validation
      // Handle v_ prefix (Smart Metrics View)
      const isView = table.startsWith('v_')
      const rawTableName = isView ? table.slice(2) : table
      
      const file = files.find((f) => f.tableName === rawTableName || f.tableName === table)
      
      if (!file) {
        // Table not found in metadata
        if (active) setOptions([])
        return
      }

      const availableCols = new Set(file.columns.map((c) => c.name))

      // If it's a view, we skip strict column validation because columns might be joined/calculated
      // If it's a raw table, we strictly check columns to prevent SQL errors
      if (!isView) {
        if (!availableCols.has(column)) {
          if (active) setOptions([])
          return
        }
      }

      // For views, we can't easily validate displayColumns against the file.columns (they might be virtual)
      // So we only filter if it's NOT a view.
      const validDisplayCols = isView 
        ? displayColumns 
        : displayColumns.filter((c) => availableCols.has(c))

      setLoading(true)
      try {
        const colsToSelect = [`"${column}" as value`]
        validDisplayCols.forEach((c) => {
          if (c !== column) colsToSelect.push(`"${c}"`)
        })

        let query = `SELECT DISTINCT ${colsToSelect.join(', ')} FROM "${table}"`
        query += ` WHERE "${column}" IS NOT NULL`

        if (searchTerm) {
          const safeTerm = searchTerm.replace(/'/g, "''")
          const conditions = [`"${column}" ILIKE '%${safeTerm}%'`]
          validDisplayCols.forEach((c) => {
            if (c !== column) conditions.push(`"${c}" ILIKE '%${safeTerm}%'`)
          })
          query += ` AND (${conditions.join(' OR ')})`
        }

        query += ` LIMIT 50`

        const result = await window.electronAPI.runSQL(query)
        if (active) {
          if (result.success && result.data) {
            setOptions(result.data.data)
          } else {
            setOptions([])
          }
        }
      } catch (e) {
        if (active) {
          console.error('Failed to fetch options', e)
          setOptions([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [table, column, JSON.stringify(displayColumns), searchTerm, files])

  return { options, loading }
}