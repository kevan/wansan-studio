import { ChatMessage } from '../components/ChatInterface'
import { format } from 'sql-formatter'
import i18n from '../i18n' // Ensure i18n instance is imported

export function generateMarkdown(messages: ChatMessage[]): string {
  const t = (key: string) => i18n.t(`common:${key}`)
  const lines: string[] = []

  lines.push(`# ${t('export_md_title')} - ${new Date().toLocaleString()}`)
  lines.push('')

  for (const msg of messages) {
    const timestamp = new Date(msg.timestamp).toLocaleString()

    if (msg.type === 'user') {
      lines.push(`## ${t('export_md_user')} (${timestamp})`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')
    } else {
      lines.push(`## ${t('export_md_assistant')} (${timestamp})`)
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
        lines.push(`### ${t('export_md_sql_plan')}`)
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
        lines.push(`### ${t('export_md_report')}: ${msg.reportData.title}`)
        lines.push('')

        if (msg.reportData.summary) {
          lines.push(`#### ${t('export_md_summary')}`)
          lines.push(msg.reportData.summary)
          lines.push('')
        }

        if (msg.reportData.sql) {
          lines.push(`#### ${t('export_md_executed_sql')}`)
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
          lines.push(`#### ${t('export_md_data_result')}`)
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
          lines.push(`*${t('export_md_total_rows')}: ${data.length}*`)
          lines.push('')
        }

        // [NEW] Export AI Business Insight
        if (msg.reportData.insight) {
          const insight = msg.reportData.insight
          lines.push(`### ${t('export_md_insights')}`)
          lines.push('')

          if (insight.summary) {
            lines.push(`#### ${t('export_md_overview')}`)
            lines.push(insight.summary)
            lines.push('')
          }

          if (insight.findings && insight.findings.length > 0) {
            lines.push(`#### ${t('export_md_key_findings')}`)
            for (const finding of insight.findings) {
              // Ensure each finding starts with a dash for list formatting
              // Check for common markdown list markers followed by space
              const cleanFinding = finding.markdown.trim()
              const isAlreadyList = /^([-*+]\s|\d+\.\s)/.test(cleanFinding)
              
              if (isAlreadyList) {
                 lines.push(cleanFinding)
              } else {
                 lines.push(`- ${cleanFinding}`)
              }
            }
            lines.push('')
          }

          if (insight.recommendation) {
            lines.push(`#### ${t('export_md_recommendations')}`)
            lines.push(insight.recommendation)
            lines.push('')
          }
        }
      }

      if (msg.status === 'error' && msg.error) {
        lines.push(`### ${t('export_md_error')}`)
        lines.push(`> ${msg.error}`)
        lines.push('')
      }
    }

    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
