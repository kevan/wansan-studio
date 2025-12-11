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
      language,
    }: {
      query: string
      schemas: TableSchema[]
      relations: RelationSuggestion[]
      context?: { lastSql: string; lastQuery: string }
      language?: 'en' | 'zh'
    }) => {
      if (!window.electronAPI || !window.electronAPI.askAI) {
        throw new Error('AI capabilities not available in this environment')
      }
      const response = await window.electronAPI.askAI(
        query,
        schemas,
        relations,
        context,
        language
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
    updateMessage: (
      id: string,
      updater: (message: ChatMessage) => ChatMessage
    ) => void,
    context?: { lastSql: string; lastQuery: string },
    language?: 'en' | 'zh'
  ) => {
    let assistantId: string | null = null
    try {
      // 1. Add User Message
      addMessage({
        id: `user-${Date.now()}`,
        type: 'user',
        content: query,
        timestamp: new Date(),
      })

      assistantId = `assistant-${Date.now()}`

      // 2. Add placeholder assistant message (thinking)
      addMessage({
        id: assistantId,
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'thinking',
      })

      // PHASE 1: Ask AI (generate plan)
      setLoadingType('thinking')
      const aiResponse = await askAIMutation.mutateAsync({
        query,
        schemas,
        relations,
        context,
        language,
      })

      if (aiResponse.status === 'error' || !aiResponse.sql) {
        throw new Error(aiResponse.error || 'AI returned an error')
      }

      const sql = aiResponse.sql
      const title = aiResponse.title
      const summary = aiResponse.summary
      const reasoning = aiResponse.reasoning
      const suggestions = aiResponse.suggestions
      const vizType = aiResponse.visualization?.type
      const vizConfig = aiResponse.visualization?.config
      const refinementHint =
        (aiResponse.reasoning || '')
          .toLowerCase()
          .includes('modified previous sql') || !!context
      const contextRef =
        refinementHint && context
          ? {
              query: context.lastQuery,
              sqlSummary: context.lastSql,
            }
          : undefined

      updateMessage(assistantId, message => ({
        ...message,
        status: 'planning',
        planSql: sql,
        planReasoning: reasoning,
        contextRef,
      }))

      // PHASE 2: Execute SQL locally
      setLoadingType('crunching')
      updateMessage(assistantId, message => ({
        ...message,
        status: 'executing',
      }))
      const execution = await window.electronAPI.runSQL(sql)
      if (!execution.success) {
        throw new Error(execution.error || 'SQL execution failed')
      }
      const data = execution.data ?? []
      const columns = data.length > 0 ? Object.keys(data[0]) : []

      setLoadingType(null)

      // 4. Add Assistant Message with Report
      updateMessage(assistantId, message => ({
        ...message,
        status: undefined,
        content: '',
        contextRef,
        reportData: {
          title: title,
          summary: summary,
          sql: sql,
          reasoning: reasoning,
          suggestions: suggestions,
          chartType: vizType,
          chartTitle: title,
          tableData: data,
          columns,
          vizConfig: vizConfig as any,
          insights: [], // Could be populated if AI returned insights list
        },
      }))
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

      if (assistantId) {
        updateMessage(assistantId, message => ({
          ...message,
          status: 'error',
          content: `Error: ${errorMessage}`,
        }))
      } else {
        addMessage({
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
          status: 'error',
        })
      }
    }
  }

  return {
    handleQuery,
    loading: loadingType,
    error: askAIMutation.error,
  }
}
