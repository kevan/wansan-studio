import { useState, useCallback } from 'react'

export interface SmartOption {
  value: any
  [key: string]: any
}

export function useSmartOptions(
  table: string,
  column: string,
  displayColumns: string[] = []
) {
  const [options, setOptions] = useState<SmartOption[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOptions = useCallback(
    async (term: string) => {
      if (!table || !column) return

      setLoading(true)
      try {
        // Build Select Clause
        const colsToSelect = [`"${column}" as value`]
        // Deduplicate display columns vs value column to avoid SQL error?
        // DuckDB allows selecting same col twice but alias helps.
        // We'll select display columns as themselves.
        
        displayColumns.forEach(c => {
            if (c !== column) colsToSelect.push(`"${c}"`)
        })

        let query = `SELECT DISTINCT ${colsToSelect.join(', ')} FROM "${table}"`
        query += ` WHERE "${column}" IS NOT NULL`

        if (term) {
          const safeTerm = term.replace(/'/g, "''")
          const conditions = [`"${column}" ILIKE '%${safeTerm}%'`]
          displayColumns.forEach(c => {
             if (c !== column) conditions.push(`"${c}" ILIKE '%${safeTerm}%'`)
          })
          query += ` AND (${conditions.join(' OR ')})`
        }

        query += ` LIMIT 50`

        const result = await window.electronAPI.runSQL(query)
        if (result.success && result.data) {
          setOptions(result.data.data)
        } else {
          setOptions([])
        }
      } catch (e) {
        console.error('Failed to fetch options', e)
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [table, column, JSON.stringify(displayColumns)]
  )

  return { options, loading, fetchOptions }
}
