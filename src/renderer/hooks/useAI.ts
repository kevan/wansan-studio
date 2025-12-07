import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRunSQL } from './useIPC'
import { ChatMessage } from '../components/ChatInterface'
import { TableSchema, AnalysisResult } from '../../shared/types'
import { LoadingType } from '../components/LoadingStates'

// Hook to handle AI interactions
export function useAI() {
  const [loadingType, setLoadingType] = useState<LoadingType | null>(null)
  
  // IPC mutation to ask AI
  const askAIMutation = useMutation({
    mutationFn: async ({ query, schemas }: { query: string; schemas: TableSchema[] }) => {
      if (!window.electronAPI || !window.electronAPI.askAI) {
        throw new Error("AI capabilities not available in this environment")
      }
      const response = await window.electronAPI.askAI(query, schemas)
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

  const handleQuery = async (
    query: string, 
    schemas: TableSchema[], 
    addMessage: (msg: ChatMessage) => void
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
      const aiResponse = await askAIMutation.mutateAsync({ query, schemas })
      const { sql, title, summary, viz_type, viz_config, reasoning } = aiResponse

      // 3. Run SQL
      setLoadingType('crunching')
      const data = await runSQLMutation.mutateAsync(sql)
      
      setLoadingType(null)

      // 4. Add Assistant Message with Report
      addMessage({
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: reasoning || "Analysis complete.",
        timestamp: new Date(),
        reportData: {
          title: title,
          summary: summary,
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
