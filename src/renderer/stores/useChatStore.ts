import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage } from '../components/ChatInterface'
import type { TableSchema, RelationSuggestion, AIAnalysisResult } from '@shared/types.ts'
import { useFileStore } from './useFileStore'
import { useToastStore } from './useToastStore'
import { useWorkbenchStore } from './useWorkbenchStore'
import { useSettingsStore } from './useSettingsStore'
import { createBigIntStorage } from '@shared/serialization.ts'
import i18n from '../i18n'

const generateId = () => crypto.randomUUID()
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let rehydrateSet: ((partial: Partial<ChatStore>) => void) | null = null

const resolveMentions = (text: string) => {
  const files = useFileStore.getState().files
  if (!files.length) return text

  return text.replace(/@(?:"([^"]+)"|'([^']+)'|([^\s]+))/g, (match, g1, g2, g3) => {
    const name = g1 || g2 || g3
    if (!name) return match
    const file = files.find(f => f.name === name)
    if (file) {
      const tableName = file.tableName || file.name || match
      return `"${tableName}"`
    }
    return match
  })
}

interface ChatStore {
  messages: ChatMessage[]
  history: ChatMessage[]
  replyToId: string | null
  abortController: AbortController | null
  setReplyTo: (id: string | null) => void
  updateMessage: (
    id: string,
    updater: (message: ChatMessage) => ChatMessage
  ) => void
  updateReportConfig: (
    id: string,
    updates: Partial<AIAnalysisResult['visualization']>
  ) => void
  updateMessageData: (
    messageId: string,
    newSql: string,
    newData: any[],
    newCols: string[]
  ) => void
  sendMessage: (
    text: string,
    schemas?: TableSchema[],
    relations?: RelationSuggestion[],
    languageOverride?: 'en' | 'zh'
  ) => Promise<void>
  retryMessage: (
    messageId: string,
    originalQuery: string
  ) => Promise<void>
  rerunAnalysis: (originalMessage: ChatMessage) => Promise<void>
  autoFixMessage: (
    messageId: string,
    error: string,
    originalQuery?: string,
    originalSql?: string
  ) => Promise<void>
  resetLoading: () => void
  stopGeneration: () => void
  removeMessage: (id: string) => void
  reset: () => void
}

const reviveMessages = (messages: ChatMessage[] = []) =>
  messages.map(message => {
    // 确保 timestamp 是 number 类型，避免 Date 对象导致 React 渲染错误
    const timestampValue = message.timestamp
    let timestamp: number

    if (typeof timestampValue === 'number') {
      timestamp = timestampValue
    } else if (typeof timestampValue === 'object' && timestampValue && 'getTime' in timestampValue) {
      // 检查是否为 Date 对象
      timestamp = (timestampValue as Date).getTime()
    } else if (typeof timestampValue === 'string') {
      timestamp = new Date(timestampValue).getTime()
    } else {
      timestamp = Date.now()
    }

    return {
      ...message,
      timestamp,
    }
  })

const initialChatState: Pick<ChatStore, 'messages' | 'history' | 'replyToId' | 'abortController'> =
  {
    messages: [],
    history: [],
    replyToId: null,
    abortController: null,
  }

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => {
      rehydrateSet = set

      return {
        ...initialChatState,
        setReplyTo: id => set({ replyToId: id }),
        updateMessage: (id, updater) =>
          set(state => {
            const nextMessages = state.messages.map(msg =>
              msg.id === id ? updater({ ...msg }) : msg
            )
            return { messages: nextMessages, history: nextMessages }
          }),
        updateReportConfig: (id, updates) =>
          set(state => {
            const nextMessages = state.messages.map(msg => {
              if (msg.id !== id || !msg.reportData) return msg
              const nextVizConfig =
                updates.config !== undefined
                  ? { ...msg.reportData.vizConfig, ...updates.config }
                  : msg.reportData.vizConfig

              return {
                ...msg,
                reportData: {
                  ...msg.reportData,
                  chartType: updates.type ?? msg.reportData.chartType,
                  vizConfig: nextVizConfig,
                },
              }
            })
            return { messages: nextMessages, history: nextMessages }
          }),
        updateMessageData: (id, newSql, newData, newCols) =>
          set(state => {
            const nextMessages = state.messages.map(msg => {
              if (msg.id !== id || !msg.reportData) return msg
              return {
                ...msg,
                reportData: {
                  ...msg.reportData,
                  sql: newSql,
                  tableData: newData,
                  columns: newCols,
                },
              }
            })
            return { messages: nextMessages, history: nextMessages }
          }),
      sendMessage: async (text, schemas, relations, languageOverride) => {
        const { messages, replyToId } = get()
        const fileState = useFileStore.getState()
        const language = languageOverride || useWorkbenchStore.getState().language || 'en'
        const readyFiles = fileState.files.filter(f => f.status === 'ready')
        const startTime = Date.now()

        const { provider } = useSettingsStore.getState()

        // Check for Key (skip if provider is 'custom' or special case)
        // We fetch the config from the backend to ensure we capture environment variables (process.env.OPENAI_API_KEY)
        let apiKey: string | undefined
        try {
          const configRes = await window.electronAPI.getAIConfig()
          if (configRes.success && configRes.data) {
            apiKey = configRes.data.apiKey
          }
        } catch (e) {
          console.error('Failed to check AI config', e)
        }

        if (!apiKey && provider !== 'custom') { // Adjust logic based on your provider requirements
           const botMsgId = generateId();
           set(state => ({
              messages: [
                 ...state.messages,
                 {
                    id: generateId(), // User Msg
                    type: 'user',
                    content: text,
                    timestamp: Date.now()
                 },
                 {
                    id: botMsgId, // Bot Msg (Error State)
                    type: 'assistant',
                    content: '',
                    status: 'error',
                    error: 'ERR_NO_API_KEY', // Special Flag
                    timestamp: Date.now() + 1
                 }
              ]
           }));
           return;
        }

        // Create and set new AbortController
        const abortController = new AbortController()
        set({ abortController })

        const resolvedSchemas =
          schemas ??
          readyFiles.map(f => ({
            tableName: f.tableName || `table_${f.id}`,
              columns: f.columns,
            }))
          const resolvedRelations =
            relations ??
            fileState.relations
              .map(rel => {
                const fileA = fileState.files.find(f => f.id === rel.fileAId)
                const fileB = fileState.files.find(f => f.id === rel.fileBId)
                if (!fileA || !fileB) return null
                return {
                  sourceTable: fileA.tableName,
                  sourceColumn: rel.columnA,
                  targetTable: fileB.tableName,
                  targetColumn: rel.columnB,
                  confidence: 1,
                  reason: 'User confirmed or auto-detected in session',
                } satisfies RelationSuggestion
              })
              .filter((r): r is RelationSuggestion => r !== null)

          // Determine context (manual reply first, otherwise last AI reply)
          const manualContextMsg =
            replyToId &&
            messages.find(
              m => m.id === replyToId && m.type === 'assistant' && m.reportData?.sql
            )
          const autoContextMsg =
            !manualContextMsg &&
            [...messages].reverse().find(
              m => m.type === 'assistant' && m.reportData?.sql
            )
          const selectedContext = manualContextMsg || autoContextMsg
          let context:
            | {
                lastSql: string
                lastQuery: string
              }
            | undefined

          if (selectedContext?.type === 'assistant' && selectedContext.reportData) {
            const selectedIndex = messages.findIndex(m => m.id === selectedContext.id)
            const precedingUser = [...messages]
              .slice(0, selectedIndex)
              .reverse()
              .find(m => m.type === 'user')
            context = {
              lastSql: selectedContext.reportData.sql || '',
              lastQuery: precedingUser?.content || '',
            }
          }

          const userMsgId = generateId()
          const botMsgId = generateId()

        const userMsg: ChatMessage = {
          id: userMsgId,
          type: 'user',
          content: text,
          timestamp: Date.now(),
        }

          const ghostMsg: ChatMessage = {
            id: botMsgId,
            type: 'assistant',
            content: '',
            timestamp: Date.now() + 1,
            status: 'thinking',
            originalQuery: text,
          }

          const nextMessages = [...messages, userMsg, ghostMsg]
          set({
            messages: nextMessages,
            history: nextMessages,
            replyToId: null,
          })

        try {
          // Check if aborted
          if (abortController.signal.aborted) {
            throw new Error('Generation aborted by user')
          }

          const resolvedPrompt = resolveMentions(text)
          const planResponse = await window.electronAPI.askAI(
            resolvedPrompt,
            resolvedSchemas,
            resolvedRelations,
            context,
            language
          )

            // Check if aborted after AI call
            if (abortController.signal.aborted) {
              throw new Error('Generation aborted by user')
            }

            if (!planResponse.success || !planResponse.data) {
              throw new Error(planResponse.error || 'AI request failed')
            }
            const plan = planResponse.data

            if (plan.status === 'error' || !plan.sql) {
              throw new Error(plan.error || 'AI returned an error')
            }

            const refinementHint =
              (plan.reasoning || '')
                .toLowerCase()
                .includes('modified previous sql') || !!context
            const contextRef =
              refinementHint && context
                ? {
                    query: context.lastQuery,
                    sqlSummary: context.lastSql,
                  }
                : undefined

            get().updateMessage(botMsgId, msg => ({
              ...msg,
              status: 'planning',
              planSql: plan.sql,
              planReasoning: plan.reasoning,
              contextRef,
            }))

            // Cinematic delay to let users see the SQL before execution
            // await sleep(800)

            // Check if aborted before execution
            if (abortController.signal.aborted) {
              throw new Error('Generation aborted by user')
            }

            get().updateMessage(botMsgId, msg => ({
              ...msg,
              status: 'executing',
            }))

            const execution = await window.electronAPI.runSQL(plan.sql)
            if (!execution.success) {
              throw new Error(execution.error || 'SQL execution failed')
            }

            const data = execution.data ?? []
            const columns = data.length > 0 ? Object.keys(data[0]) : []
            const endTime = Date.now()
            const latency = endTime - startTime

            get().updateMessage(botMsgId, msg => ({
              ...msg,
              status: undefined,
              content: plan.summary || '',
              metadata: {
                latency,
              },
              reportData: {
                title: plan.title,
                summary: plan.summary,
                sql: plan.sql,
                reasoning: plan.reasoning,
                suggestions: plan.suggestions,
                chartType: plan.visualization?.type,
                chartTitle: plan.title,
                tableData: data,
                columns,
                vizConfig: plan.visualization?.config as any,
                insights: [],
              },
            }))

            // Clear abort controller on success
            set({ abortController: null })
          } catch (error: any) {
            get().updateMessage(botMsgId, msg => ({
              ...msg,
              status: 'error',
              content: `Error: ${error?.message || 'Unknown error'}`,
            }))

            // Clear abort controller on error
            set({ abortController: null })
          }
        },
        retryMessage: async (messageId, originalQuery) => {
          const { messages } = get()
          const fileState = useFileStore.getState()
          const language = useWorkbenchStore.getState().language || 'en'
          const readyFiles = fileState.files.filter(f => f.status === 'ready')
          const startTime = Date.now()

          // Locate the message to retry
          const targetMsgIndex = messages.findIndex(m => m.id === messageId)
          if (targetMsgIndex === -1) return
          const targetMsg = messages[targetMsgIndex]

          // Set status to thinking and clear error/content
          get().updateMessage(messageId, msg => ({
            ...msg,
            status: 'thinking',
            error: undefined,
            content: '',
            reportData: undefined, // Clear old report data
          }))

          // Create and set new AbortController
          const abortController = new AbortController()
          set({ abortController })

          const schemas: TableSchema[] = readyFiles.map(f => ({
            tableName: f.tableName || `table_${f.id}`,
            columns: f.columns,
          }))

          const relations: RelationSuggestion[] = fileState.relations
            .map(rel => {
              const fileA = fileState.files.find(f => f.id === rel.fileAId)
              const fileB = fileState.files.find(f => f.id === rel.fileBId)
              if (!fileA || !fileB) return null
              return {
                sourceTable: fileA.tableName,
                sourceColumn: rel.columnA,
                targetTable: fileB.tableName,
                targetColumn: rel.columnB,
                confidence: 1,
                reason: 'User confirmed or auto-detected in session',
              } satisfies RelationSuggestion
            })
            .filter((r): r is RelationSuggestion => r !== null)

          // Determine context (from messages preceding the target)
          const precedingMessages = messages.slice(0, targetMsgIndex)
          const contextMsg = [...precedingMessages].reverse().find(
            m => m.type === 'assistant' && m.reportData?.sql
          )
          
          let context:
            | {
                lastSql: string
                lastQuery: string
              }
            | undefined

          if (contextMsg?.type === 'assistant' && contextMsg.reportData) {
            const contextIndex = messages.findIndex(m => m.id === contextMsg.id)
            const precedingUser = [...messages]
              .slice(0, contextIndex)
              .reverse()
              .find(m => m.type === 'user')
            context = {
              lastSql: contextMsg.reportData.sql || '',
              lastQuery: precedingUser?.content || '',
            }
          }

          try {
            if (abortController.signal.aborted) {
              throw new Error('Generation aborted by user')
            }

            const resolvedPrompt = resolveMentions(originalQuery)
            const planResponse = await window.electronAPI.askAI(
              resolvedPrompt,
              schemas,
              relations,
              context,
              language
            )

            if (abortController.signal.aborted) {
              throw new Error('Generation aborted by user')
            }

            if (!planResponse.success || !planResponse.data) {
              throw new Error(planResponse.error || 'AI request failed')
            }
            const plan = planResponse.data

            if (plan.status === 'error' || !plan.sql) {
              throw new Error(plan.error || 'AI returned an error')
            }

             const refinementHint =
              (plan.reasoning || '')
                .toLowerCase()
                .includes('modified previous sql') || !!context
            const contextRef =
              refinementHint && context
                ? {
                    query: context.lastQuery,
                    sqlSummary: context.lastSql,
                  }
                : undefined

            get().updateMessage(messageId, msg => ({
              ...msg,
              status: 'planning',
              planSql: plan.sql,
              planReasoning: plan.reasoning,
              contextRef,
            }))

            if (abortController.signal.aborted) {
              throw new Error('Generation aborted by user')
            }

            get().updateMessage(messageId, msg => ({
              ...msg,
              status: 'executing',
            }))

            const execution = await window.electronAPI.runSQL(plan.sql)
            if (!execution.success) {
              throw new Error(execution.error || 'SQL execution failed')
            }

            const data = execution.data ?? []
            const columns = data.length > 0 ? Object.keys(data[0]) : []
            const endTime = Date.now()
            const latency = endTime - startTime

            get().updateMessage(messageId, msg => ({
              ...msg,
              status: undefined,
              content: plan.summary || '',
              metadata: {
                latency,
              },
              reportData: {
                title: plan.title,
                summary: plan.summary,
                sql: plan.sql,
                reasoning: plan.reasoning,
                suggestions: plan.suggestions,
                chartType: plan.visualization?.type,
                chartTitle: plan.title,
                tableData: data,
                columns,
                vizConfig: plan.visualization?.config as any,
                insights: [],
              },
            }))

            set({ abortController: null })
          } catch (error: any) {
            get().updateMessage(messageId, msg => ({
              ...msg,
              status: 'error',
              content: `Error: ${error?.message || 'Unknown error'}`,
            }))

            set({ abortController: null })
          }
        },
        rerunAnalysis: async originalMessage => {
          if (!originalMessage.originalQuery) {
            useToastStore.getState().addToast({
              type: 'error',
              title: i18n.t('error_cannot_rerun_title', { ns: 'chat' }),
              description: i18n.t('error_cannot_rerun_desc', { ns: 'chat' }),
              duration: 4000,
            })
            return
          }

          await get().sendMessage(originalMessage.originalQuery)
        },
        autoFixMessage: async (messageId: string, error: string, originalQuery?: string, originalSql?: string) => {
          const message = get().messages.find(m => m.id === messageId)
          if (!message) return

          // Set status to repairing
          get().updateMessage(messageId, msg => ({
            ...msg,
            status: 'executing',
            content: '🔧 Attempting to auto-fix the SQL query...',
          }))

          try {
            // Get the current schemas
            const fileState = useFileStore.getState()
            const readyFiles = fileState.files.filter(f => f.status === 'ready')
            const schemas: TableSchema[] = readyFiles.map(f => ({
              tableName: f.tableName || `table_${f.id}`,
              columns: f.columns,
            }))

            // Call AI to fix the SQL
            if (!originalSql) {
              throw new Error(i18n.t('error_no_sql_to_fix', { ns: 'chat' }))
            }

            const fixResult = await window.electronAPI.fixSQL(
              originalSql,
              error,
              schemas
            )

            if (!fixResult.success || !fixResult.data) {
              throw new Error(fixResult.error || i18n.t('error_failed_to_fix_sql', { ns: 'chat' }))
            }

            const { sql: fixedSql, reasoning } = fixResult.data

            // Execute the fixed SQL
            const execution = await window.electronAPI.runSQL(fixedSql)

            if (!execution.success) {
              throw new Error(execution.error || i18n.t('error_fixed_sql_execution_failed', { ns: 'chat' }))
            }

            const data = execution.data ?? []
            const columns = data.length > 0 ? Object.keys(data[0]) : []

            // Update message with success
            get().updateMessage(messageId, msg => ({
              ...msg,
              type: 'assistant',
              status: undefined,
              content: i18n.t('autofix_successful_content', { ns: 'chat' }),
              reportData: {
                title: i18n.t('autofix_fixed_title', {
                  ns: 'chat',
                  query: msg.originalQuery || i18n.t('autofix_fixed_query_fallback', { ns: 'chat' })
                }),
                summary: i18n.t('autofix_summary', {
                  ns: 'chat',
                  error,
                  reasoning
                }),
                sql: fixedSql,
                reasoning: i18n.t('autofix_reasoning', { ns: 'chat', reasoning }),
                suggestions: [],
                chartType: 'table',
                chartTitle: i18n.t('autofix_chart_title', { ns: 'chat' }),
                tableData: data,
                columns,
                vizConfig: {},
                insights: [],
              },
            }))

            useToastStore.getState().addToast({
              type: 'success',
              title: i18n.t('autofix_success_toast_title', { ns: 'chat' }),
              description: i18n.t('autofix_success_toast_desc', { ns: 'chat' }),
              duration: 4000,
            })

          } catch (error: any) {
            // Update message with error
            get().updateMessage(messageId, msg => ({
              ...msg,
              status: 'error',
              content: i18n.t('autofix_failed_content', {
                ns: 'chat',
                error: error?.message || i18n.t('error_unknown', { ns: 'chat' })
              }),
            }))

            useToastStore.getState().addToast({
              type: 'error',
              title: i18n.t('autofix_failed_toast_title', { ns: 'chat' }),
              description: error?.message || i18n.t('autofix_failed_toast_desc', { ns: 'chat' }),
              duration: 4000,
            })
          }
        },
        resetLoading: () => {
          set(state => ({
            abortController: null,
            messages: state.messages.map(m =>
              m.status === 'thinking' || m.status === 'planning' || m.status === 'executing'
                ? { ...m, status: 'error', content: i18n.t('interrupted_retry', { ns: 'chat' }) }
                : m
            ),
            history: state.history.map(m =>
              m.status === 'thinking' || m.status === 'planning' || m.status === 'executing'
                ? { ...m, status: 'error', content: i18n.t('interrupted_retry', { ns: 'chat' }) }
                : m
            ),
          }))
        },
        stopGeneration: () => {
          const { abortController } = get()
          if (abortController) {
            abortController.abort()
          }
          get().resetLoading()
        },
        removeMessage: (id: string) => {
          set(state => {
            const nextMessages = state.messages.filter(m => m.id !== id)
            return {
              messages: nextMessages,
              history: nextMessages,
              replyToId: state.replyToId === id ? null : state.replyToId,
            }
          })
        },
        reset: () => set({ ...initialChatState }),
      }
    },
    {
      name: 'wansan-chat',
      storage: createBigIntStorage(),
      partialize: state => ({
        messages: state.messages,
        history: state.history,
      }),
      onRehydrateStorage: () => state => {
        if (!state) return
        rehydrateSet?.({
          messages: reviveMessages(state.messages),
          history: reviveMessages(state.history),
        })
      },
    }
  )
)
