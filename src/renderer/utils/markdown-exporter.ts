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

      if (msg.content) {
        lines.push(msg.content)
        lines.push('')
      }

      if (msg.planSql) {
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
        if (msg.reportData.subtitle) {
          lines.push(`_${msg.reportData.subtitle}_`)
        }
        lines.push('')

        if (msg.reportData.summary) {
          lines.push('#### Summary')
          lines.push(msg.reportData.summary)
          lines.push('')
        }

        if (msg.reportData.insights && msg.reportData.insights.length > 0) {
          lines.push('#### Key Insights')
          for (const insight of msg.reportData.insights) {
            lines.push(`- ${insight}`)
          }
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
