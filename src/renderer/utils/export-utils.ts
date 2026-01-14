/**
 * Converts an array of objects to a CSV string.
 * @param data Array of data objects
 * @param columns Optional list of column names to include/order
 * @returns CSV string
 */
export function dataToCSV(data: any[], columns?: string[]): string {
  if (!data || data.length === 0) return ''

  // Determine columns if not provided
  const header = columns || Object.keys(data[0])
  
  // Create CSV header row
  const csvRows = [
    header.map(col => `"${String(col).replace(/"/g, '""')}"`).join(',')
  ]

  // Create data rows
  for (const row of data) {
    const values = header.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const strVal = String(val)
      // Escape double quotes and wrap in quotes
      return `"${strVal.replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}
