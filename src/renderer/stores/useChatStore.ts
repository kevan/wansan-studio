import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ChatMessage } from '../components/ChatInterface'
import type { TableSchema, RelationSuggestion, AIAnalysisResult } from '../../shared/types'
import { useFileStore } from './useFileStore'
import { useToastStore } from './useToastStore'
import { useWorkbenchStore } from './useWorkbenchStore'

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
  setReplyTo: (id: string | null) => void
  updateMessage: (
    id: string,
    updater: (message: ChatMessage) => ChatMessage
  ) => void
  updateReportConfig: (
    id: string,
    updates: Partial<AIAnalysisResult['visualization']>
  ) => void
  sendMessage: (
    text: string,
    schemas?: TableSchema[],
    relations?: RelationSuggestion[],
    languageOverride?: 'en' | 'zh'
  ) => Promise<void>
  rerunAnalysis: (originalMessage: ChatMessage) => Promise<void>
  reset: () => void
}

const reviveMessages = (messages: ChatMessage[] = []) =>
  messages.map(message => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }))

const initialChatState: Pick<ChatStore, 'messages' | 'history' | 'replyToId'> =
  {
    messages: [],
    history: [],
    replyToId: null,
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
      sendMessage: async (text, schemas, relations, languageOverride) => {
        const { messages, replyToId } = get()
        const fileState = useFileStore.getState()
        const language = languageOverride || useWorkbenchStore.getState().language || 'en'
        const readyFiles = fileState.files.filter(f => f.status === 'ready')
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
          timestamp: new Date(),
        }

          const ghostMsg: ChatMessage = {
            id: botMsgId,
            type: 'assistant',
            content: '',
            timestamp: new Date(Date.now() + 1),
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
          const resolvedPrompt = resolveMentions(text)
          const planResponse = await window.electronAPI.askAI(
            resolvedPrompt,
            resolvedSchemas,
            resolvedRelations,
            context,
            language
          )
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
            await sleep(800)

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

            get().updateMessage(botMsgId, msg => ({
              ...msg,
              status: undefined,
              content: plan.summary || '',
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
          } catch (error: any) {
            get().updateMessage(botMsgId, msg => ({
              ...msg,
              status: 'error',
              content: `Error: ${error?.message || 'Unknown error'}`,
            }))
          }
        },
        rerunAnalysis: async originalMessage => {
          if (!originalMessage.originalQuery) {
            useToastStore.getState().addToast({
              type: 'error',
              title: 'Cannot rerun',
              description: 'Original query missing.',
              duration: 4000,
            })
            return
          }

          await get().sendMessage(originalMessage.originalQuery)
        },
        reset: () => set({ ...initialChatState }),
      }
    },
    {
      name: 'wansan-chat',
      storage: createJSONStorage(() => localStorage),
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
