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
  const files = useProjectStore(s => s.files)

  const displayColsKey = JSON.stringify(displayColumns)

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      if (!table || !column) {
        if (active) setOptions([])
        return
      }

      // 1. Validation
      const isView = table.startsWith('v_')
      const rawTableName = isView ? table.slice(2) : table

      const file = files.find(
        f => f.tableName === rawTableName || f.tableName === table
      )

      if (!file) {
        if (active) setOptions([])
        return
      }

      const availableCols = new Set(file.columns.map(c => c.name))

      if (!isView) {
        if (!availableCols.has(column)) {
          if (active) setOptions([])
          return
        }
      }

      const validDisplayCols = isView
        ? displayColumns
        : displayColumns.filter(c => availableCols.has(c))

      setLoading(true)
      try {
        const colsToSelect = [`"${column}" as value`]
        validDisplayCols.forEach(c => {
          if (c !== column) colsToSelect.push(`"${c}"`)
        })

        let query = `SELECT DISTINCT ${colsToSelect.join(', ')} FROM "${table}"`
        query += ` WHERE "${column}" IS NOT NULL`

        if (searchTerm) {
          const safeTerm = searchTerm.replace(/'/g, "''")
          const conditions = [`"${column}" ILIKE '%${safeTerm}%'`]
          validDisplayCols.forEach(c => {
            if (c !== column) conditions.push(`"${c}" ILIKE '%${safeTerm}%'`)
          })
          query += ` AND (${conditions.join(' OR ')})`
        }

        query += ` LIMIT 50`

        const result = await window.electronAPI.runSQL(query)
        if (active) {
          if (result.success && result.data) {
            setOptions(result.data.data as any)
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
  }, [table, column, displayColsKey, searchTerm, files, displayColumns])

  return { options, loading }
}