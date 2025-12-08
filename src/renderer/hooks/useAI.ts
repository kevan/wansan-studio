import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRunSQL, useFixSQL } from './useIPC'
import { ChatMessage } from '../components/ChatInterface'
import { TableSchema, AnalysisResult, RelationSuggestion } from '../../shared/types'
import { LoadingType } from '../components/LoadingStates'

// Hook to handle AI interactions
export function useAI() {
  const [loadingType, setLoadingType] = useState<LoadingType | null>(null)
  
  // IPC mutation to ask AI
  const askAIMutation = useMutation({
    mutationFn: async ({ query, schemas, relations, context }: { query: string; schemas: TableSchema[]; relations: RelationSuggestion[]; context?: { lastSql: string, lastQuery: string } }) => {
      if (!window.electronAPI || !window.electronAPI.askAI) {
        throw new Error("AI capabilities not available in this environment")
      }
      const response = await window.electronAPI.askAI(query, schemas, relations, context)
      if (!response.success || !response.data) {
        throw new Error(response.error || "AI request failed")
      }
      return response.data as AnalysisResult
    },
    onMutate: () => setLoadingType('thinking'),
    onError: () => setLoadingType(null)
  })

  // IPC mutation to run SQL
  const runSQLMutation = useRunSQL()
  
  // IPC mutation to fix SQL
  const fixSQLMutation = useFixSQL()

  const handleQuery = async (
    query: string, 
    schemas: TableSchema[],
    relations: RelationSuggestion[], 
    addMessage: (msg: ChatMessage) => void,
    context?: { lastSql: string, lastQuery: string }
  ) => {
    try {
      // 1. Add User Message
      addMessage({
        id: `user-${Date.now()}`,
        type: 'user',
        content: query,
        timestamp: new Date()
      })

      // 2. Ask AI
      setLoadingType('thinking')
      const aiResponse = await askAIMutation.mutateAsync({ query, schemas, relations, context })
      
      // Check for calculation errors or "impossible" requests
      if (aiResponse.error) {
        throw new Error(aiResponse.error)
      }

      // Use "let" so we can update them if retry happens
      let { sql, title, summary, viz_type, viz_config, reasoning, suggestions } = aiResponse

      // Ensure SQL is present before proceeding
      if (!sql) {
        throw new Error("AI could not generate a valid query.")
      }

      // 3. Run SQL with Auto-Retry (Self-Healing)
      setLoadingType('crunching')
      
      let data: any[] = []
      let attempts = 0
      const maxRetries = 1
      
      while (attempts <= maxRetries) {
        try {
           data = await runSQLMutation.mutateAsync(sql)
           break; // Success, exit loop
        } catch (error) {
           attempts++
           if (attempts > maxRetries) {
             throw error; // Give up
           }
           
           console.warn(`[SQL Error] Attempt ${attempts} failed. Auto-fixing...`, error)
           setLoadingType('fixing')
           
           // Call AI to fix the SQL
           const fixResult = await fixSQLMutation.mutateAsync({ 
             sql, 
             error: error instanceof Error ? error.message : String(error), 
             schemas 
           })
           
           // Apply fix
           sql = fixResult.sql
           reasoning += `\n\n[Auto-Fix] SQL was corrected: ${fixResult.reasoning}`
           setLoadingType('crunching') // Switch back to crunching for the next try
        }
      }
      
      setLoadingType(null)

      // 4. Add Assistant Message with Report
      addMessage({
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: "", // Content is now inside the ReportCard (reasoning)
        timestamp: new Date(),
        reportData: {
          title: title,
          summary: summary,
          sql: sql,
          reasoning: reasoning,
          suggestions: suggestions,
          chartType: viz_type as any, // 'bar' | 'line' | 'pie' | 'table'
          chartTitle: title,
          tableData: data,
          vizConfig: viz_config,
          insights: [] // Could be populated if AI returned insights list
        }
      })

    } catch (error) {
      setLoadingType(null)
      addMessage({
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      })
    }
  }

  return {
    handleQuery,
    loading: loadingType,
    error: askAIMutation.error || runSQLMutation.error
  }
}
