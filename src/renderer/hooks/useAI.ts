import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChatMessage } from '../components/ChatInterface'
import {
  TableSchema,
  AIAnalysisResult,
  RelationSuggestion,
} from '../../shared/types'
import { LoadingType } from '../components/LoadingStates'
import { useToastStore } from '../stores/useToastStore'

// Hook to handle AI interactions
export function useAI() {
  const [loadingType, setLoadingType] = useState<LoadingType | null>(null)
  const { addToast } = useToastStore()

  // IPC mutation to ask AI
  const askAIMutation = useMutation({
    mutationFn: async ({
      query,
      schemas,
      relations,
      context,
    }: {
      query: string
      schemas: TableSchema[]
      relations: RelationSuggestion[]
      context?: { lastSql: string; lastQuery: string }
    }) => {
      if (!window.electronAPI || !window.electronAPI.askAI) {
        throw new Error('AI capabilities not available in this environment')
      }
      const response = await window.electronAPI.askAI(
        query,
        schemas,
        relations,
        context
      )
      if (!response.success || !response.data) {
        throw new Error(response.error || 'AI request failed')
      }
      return response.data as AIAnalysisResult
    },
    onMutate: () => setLoadingType('thinking'),
    onError: () => setLoadingType(null),
  })

  // IPC mutation to run SQL
  const handleQuery = async (
    query: string,
    schemas: TableSchema[],
    relations: RelationSuggestion[],
    addMessage: (msg: ChatMessage) => void,
    context?: { lastSql: string; lastQuery: string }
  ) => {
    try {
      // 1. Add User Message
      addMessage({
        id: `user-${Date.now()}`,
        type: 'user',
        content: query,
        timestamp: new Date(),
      })

      // 2. Ask AI
      setLoadingType('thinking')
      const aiResponse = await askAIMutation.mutateAsync({
        query,
        schemas,
        relations,
        context,
      })

      if (aiResponse.status === 'error') {
        throw new Error(aiResponse.error || 'AI returned an error')
      }

      const sql =
        aiResponse.sql ||
        (() => {
          throw new Error('AI could not generate a valid query.')
        })()

      const title = aiResponse.title
      const summary = aiResponse.summary
      const reasoning = aiResponse.reasoning
      const suggestions = aiResponse.suggestions
      const data = aiResponse.data ?? []
      const vizType = aiResponse.visualization?.type
      const vizConfig = aiResponse.visualization?.config

      setLoadingType(null)

      // 4. Add Assistant Message with Report
      addMessage({
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: '', // Content is now inside the ReportCard (reasoning)
        timestamp: new Date(),
        reportData: {
          title: title,
          summary: summary,
          sql: sql,
          reasoning: reasoning,
          suggestions: suggestions,
          chartType: vizType,
          chartTitle: title,
          tableData: data,
          vizConfig: vizConfig as any,
          insights: [], // Could be populated if AI returned insights list
        },
      })
    } catch (error) {
      setLoadingType(null)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'

      addToast({
        type: 'error',
        title: 'Analysis Failed',
        description: errorMessage,
        duration: 5000,
      })

      addMessage({
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      })
    }
  }

  return {
    handleQuery,
    loading: loadingType,
    error: askAIMutation.error,
  }
}
