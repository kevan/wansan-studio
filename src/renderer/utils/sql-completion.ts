import { Monaco } from '@monaco-editor/react'
import { FileNode } from '@shared/types'

/**
 * Common DuckDB Keywords
 */
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'FULL',
  'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'BETWEEN', 'LIKE', 'ILIKE', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'WITH', 'UNION', 'ALL', 'DISTINCT', 'OVER', 'PARTITION BY', 'ROWS', 'UNBOUNDED', 'PRECEDING'
]

/**
 * Common DuckDB Functions
 */
const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'MEDIAN', 'QUANTILE', 'STDDEV', 'VAR_POP', 'LIST', 'ARRAY_AGG',
  'DATE_TRUNC', 'DATE_PART', 'STRFTIME', 'STRPTIME', 'TODAY', 'NOW', 'AGE',
  'COALESCE', 'IFNULL', 'NULLIF',
  'CAST', 'TRY_CAST',
  'CONCAT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'UPPER', 'LOWER', 'TRIM'
]

/**
 * Registers Wansan-specific SQL completion items (Tables, Columns, Metrics)
 */
export function registerSqlCompletion(monaco: Monaco, files: FileNode[]) {
  // Dispose previous provider if any? 
  // Monaco usually manages this by language ID, but for dynamic schemas, 
  // we might need to dispose and re-register or use a shared reference.
  
  return monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: any[] = []

      // 1. Keywords
      SQL_KEYWORDS.forEach(kw => {
        suggestions.push({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: `${kw} `, // Auto-append space
          range,
        })
      })

      // 2. Functions
      SQL_FUNCTIONS.forEach(fn => {
        suggestions.push({
          label: fn,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${fn}($0)`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })
      })

      // 3. Tables (Files)
      files.forEach(file => {
        suggestions.push({
          label: file.tableName,
          detail: `Table: ${file.name}`,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: `"${file.tableName}"`,
          range,
        })

        // 4. Columns for this table
        file.columns.forEach(col => {
          suggestions.push({
            label: col.name,
            detail: `Column (${col.type}) in ${file.tableName}`,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: `"${col.name}"`,
            range,
          })
        })

        // 5. Smart Metrics
        if (file.smartMetrics) {
          file.smartMetrics.forEach(metric => {
            suggestions.push({
              label: metric.name,
              detail: `Metric in ${file.tableName}`,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: `"${metric.name}"`,
              range,
            })
          })
        }

        // 6. Relations (JOIN Snippets)
        if (file.relations) {
          file.relations.forEach(rel => {
            const targetFile = files.find(f => f.id === rel.targetFileId)
            if (targetFile) {
              const joinType = rel.joinType || 'LEFT'
              const label = `${joinType} JOIN ${targetFile.tableName}`
              const insertText = `${joinType} JOIN "${targetFile.tableName}" ON "${file.tableName}"."${rel.sourceColumn}" = "${targetFile.tableName}"."${rel.targetColumn}"`
              
              suggestions.push({
                label: label,
                detail: `Relation: ${file.tableName} -> ${targetFile.tableName}`,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
                documentation: {
                  value: `Auto-generated JOIN based on relationship:\n${file.tableName}.${rel.sourceColumn} = ${targetFile.tableName}.${rel.targetColumn}`
                }
              })
            }
          })
        }
      })

      return { suggestions }
    },
  })
}
