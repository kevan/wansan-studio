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

/**
 * Capture a chart as base64 and its dimensions from a container ID.
 */
async function captureChartInfo(exportId: string): Promise<{ dataUrl: string; width: number; height: number } | undefined> {
  const container = document.querySelector(`[data-export-id="${exportId}"]`)
  if (!container) return undefined

  const canvas = container.querySelector('canvas')
  if (!canvas) return undefined

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height
  }
}

/**
 * Formats structured AI insight into a plain string for Excel.
 */
function formatInsight(insight: any): string | undefined {
  if (!insight) return undefined
  if (typeof insight === 'string') return insight

  const parts: string[] = []
  if (insight.summary) parts.push(`Summary: ${insight.summary}\n`)
  
  if (Array.isArray(insight.findings)) {
    parts.push('Key Findings:')
    insight.findings.forEach((f: any) => {
      parts.push(`- ${f.markdown || f.content || ''}`)
    })
    parts.push('')
  }

  if (insight.recommendation) {
    parts.push(`Recommendation: ${insight.recommendation}`)
  }

  return parts.join('\n').trim()
}

/**
 * Collects data for Excel export from Chat Messages.
 */
export async function collectExcelDataFromChat(messages: any[]): Promise<any[]> {
  const sheets: any[] = []

  for (const msg of messages) {
    if (msg.type === 'assistant' && msg.reportData && msg.reportData.tableData) {
      const report = msg.reportData
      const chartInfo = await captureChartInfo(msg.id)
      
      sheets.push({
        name: report.title || `Chat_${msg.id.slice(0, 4)}`,
        data: report.tableData,
        columns: report.columnFields || [],
        insight: formatInsight(report.insight),
        chartImage: chartInfo?.dataUrl,
        chartWidth: chartInfo?.width,
        chartHeight: chartInfo?.height
      })
    }
  }

  return sheets
}

/**
 * Collects data for Excel export from Dashboard Widgets.
 */
export async function collectExcelDataFromDashboard(widgets: any[]): Promise<any[]> {
  const sheets: any[] = []

  for (const widget of widgets) {
    const report = widget.reportData
    if (report && report.tableData && report.chartType !== 'text') {
      const chartInfo = await captureChartInfo(widget.id)
      
      sheets.push({
        name: report.title || `Widget_${widget.id.slice(0, 4)}`,
        data: report.tableData,
        columns: report.columnFields || [],
        insight: formatInsight(report.insight),
        chartImage: chartInfo?.dataUrl,
        chartWidth: chartInfo?.width,
        chartHeight: chartInfo?.height
      })
    }
  }

  return sheets
}
