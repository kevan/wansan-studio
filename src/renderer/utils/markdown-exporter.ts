import { ChatMessage } from '../components/ChatInterface'
import { format } from 'sql-formatter'

export function generateMarkdown(messages: ChatMessage[]): string {
  const lines: string[] = []

  lines.push(`# Chat Export - ${new Date().toLocaleString()}`)
  lines.push('')

  for (const msg of messages) {
    const timestamp = new Date(msg.timestamp).toLocaleString()

    if (msg.type === 'user') {
      lines.push(`## User (${timestamp})`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')
    } else {
      lines.push(`## Assistant (${timestamp})`)
      lines.push('')

      // 1. Content (Skip if it duplicates summary)
      const isDuplicateSummary =
        msg.reportData && msg.content === msg.reportData.summary
      if (msg.content && !isDuplicateSummary) {
        lines.push(msg.content)
        lines.push('')
      }

      // 2. SQL Plan (Skip if we have the final Executed SQL in reportData)
      const hasExecutedSql = !!(msg.reportData && msg.reportData.sql)
      if (msg.planSql && !hasExecutedSql) {
        lines.push('### SQL Plan')
        lines.push('```sql')
        try {
          lines.push(format(msg.planSql, { language: 'postgresql' }))
        } catch {
          lines.push(msg.planSql)
        }
        lines.push('```')
        lines.push('')
      }

      if (msg.reportData) {
        lines.push(`### Report: ${msg.reportData.title}`)
        lines.push('')

        if (msg.reportData.summary) {
          lines.push('#### Summary')
          lines.push(msg.reportData.summary)
          lines.push('')
        }

        if (msg.reportData.sql) {
          lines.push('#### Executed SQL')
          lines.push('```sql')
          try {
            lines.push(format(msg.reportData.sql, { language: 'postgresql' }))
          } catch {
            lines.push(msg.reportData.sql)
          }
          lines.push('```')
          lines.push('')
        }

        // [NEW] Export Data Table
        if (msg.reportData.tableData && msg.reportData.tableData.length > 0) {
          lines.push('#### Data Result')
          const data = msg.reportData.tableData
          const columns =
            msg.reportData.columnFields?.map(c => c.name) ||
            Object.keys(data[0])

          // Header
          lines.push(`| ${columns.join(' | ')} |`)
          lines.push(`| ${columns.map(() => '---').join(' | ')} |`)

          // Rows
          for (const row of data) {
            const rowStr = columns
              .map(col => {
                const val = row[col]
                // Simple escaping for pipe characters
                return String(val ?? '')
                  .replace(/\|/g, '\\|')
                  .replace(/\n/g, ' ')
              })
              .join(' | ')
            lines.push(`| ${rowStr} |`)
          }
          lines.push('')
          lines.push(`*Total Rows: ${data.length}*`)
          lines.push('')
        }
      }

      if (msg.status === 'error' && msg.error) {
        lines.push('### Error')
        lines.push(`> ${msg.error}`)
        lines.push('')
      }
    }

    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
