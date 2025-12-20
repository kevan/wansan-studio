import { useProjectStore } from './useProjectStore'
import { useFileStore } from './useFileStore'
import { useSettingsStore } from './useSettingsStore'
import { useToastStore } from './useToastStore'
import { useWorkbenchStore } from './useWorkbenchStore'
import { Analytics } from '../services/analytics'
import type { ChatMessage } from '../components/ChatInterface'
import type {
  TableSchema,
  RelationSuggestion,
  AIAnalysisResult,
} from '@shared/types'
import i18n from '../i18n'

// Types
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
  retryMessage: (messageId: string, originalQuery: string) => Promise<void>
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

const generateId = () => crypto.randomUUID()
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const resolveMentions = (text: string) => {
  const files = useFileStore.getState().files
  if (!files.length) return text

  return text.replace(
    /@(?:"([^"]+)"|'([^']+)'|([^\s]+))/g,
    (match, g1, g2, g3) => {
      const name = g1 || g2 || g3
      if (!name) return match
      const file = files.find(f => f.name === name)
      if (file) {
        const tableName = file.tableName || file.name || match
        return `"${tableName}"`
      }
      return match
    }
  )
}

// Helper to get active session state safely
const getSessionState = () => {
  const projectState = useProjectStore.getState()
  const session = projectState.sessions.find(s => s.id === projectState.activeSessionId)
  
  const resolvedMessages = (session?.messages || []).map(m => {
      if (m.widgetId && projectState.widgetRegistry[m.widgetId]) {
          return { ...m, reportData: projectState.widgetRegistry[m.widgetId] }
      }
      return m
  })

  return {
    projectState,
    session,
    messages: resolvedMessages as ChatMessage[],
    replyToId: session?.replyToId || null,
    abortController: projectState.abortControllers[projectState.activeSessionId] || null
  }
}

// --- Actions Implementation ---

const updateMessage = (id: string, updater: (message: ChatMessage) => ChatMessage) => {
  const { messages } = getSessionState()
  const msg = messages.find(m => m.id === id)
  if (msg) {
    useProjectStore.getState().updateMessage(id, updater(msg) as any)
  }
}

const updateReportConfig = (id: string, updates: Partial<AIAnalysisResult['visualization']>) => {
    updateMessage(id, (msg) => {
        if (!msg.reportData) return msg
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
}

const updateMessageData = (id: string, newSql: string, newData: any[], newCols: string[]) => {
    updateMessage(id, (msg) => {
        if (!msg.reportData) return msg
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
}

const resetLoading = () => {
    const { session } = getSessionState()
    if (!session) return
    
    // Clear abort controller
    useProjectStore.getState().setAbortController(null)

    // Mark loading messages as error
    session.messages.forEach(m => {
        if (m.status === 'thinking' || m.status === 'planning' || m.status === 'executing') {
            useProjectStore.getState().updateMessage(m.id, {
                status: 'error',
                content: i18n.t('interrupted_retry', { ns: 'chat' }),
            } as any)
        }
    })
}

const stopGeneration = () => {
    const { abortController } = getSessionState()
    if (abortController) {
        abortController.abort()
    }
    resetLoading()
}

const sendMessage = async (
    text: string, 
    schemas?: TableSchema[], 
    relations?: RelationSuggestion[], 
    languageOverride?: 'en' | 'zh'
) => {
    const { messages, replyToId } = getSessionState()
    const fileState = useFileStore.getState()
    const language = languageOverride || useSettingsStore.getState().language || 'en'
    const readyFiles = fileState.files.filter(f => f.status === 'ready')
    const startTime = Date.now()
    const { provider } = useSettingsStore.getState()

    // API Key Check
    let apiKey: string | undefined
    try {
        const configRes = await window.electronAPI.getAIConfig()
        if (configRes.success && configRes.data) {
            apiKey = configRes.data.apiKey
        }
    } catch (e) {
        console.error('Failed to check AI config', e)
    }

    if (!apiKey && provider !== 'custom') {
        const botMsgId = generateId()
        // Add User Msg
        useProjectStore.getState().addMessage({
            id: generateId(),
            type: 'user',
            content: text,
            timestamp: Date.now(),
        } as any)
        
        // Add Error Msg
        useProjectStore.getState().addMessage({
            id: botMsgId,
            type: 'assistant',
            content: '',
            status: 'error',
            error: 'ERR_NO_API_KEY',
            timestamp: Date.now() + 1,
        } as any)
        return
    }

    // Abort Controller
    const abortController = new AbortController()
    useProjectStore.getState().setAbortController(abortController)

    const resolvedSchemas = schemas ?? readyFiles.map(f => ({
        tableName: f.tableName || `table_${f.id}`,
        columns: f.columns,
    }))
    
    const resolvedRelations = relations ?? fileState.relations
        .map(rel => {
            const fileA = fileState.files.find(f => f.id === rel.fileAId)
            const fileB = fileState.files.find(f => f.id === rel.fileBId)
            if (!fileA || !fileB || fileA.status !== 'ready' || fileB.status !== 'ready') return null
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

    // Determine Context
    const manualContextMsg = replyToId && messages.find(m => m.id === replyToId && m.type === 'assistant' && m.reportData?.sql)
    const autoContextMsg = !manualContextMsg && [...messages].reverse().find(m => m.type === 'assistant' && m.reportData?.sql)
    const selectedContext = manualContextMsg || autoContextMsg
    let context: { lastSql: string; lastQuery: string } | undefined

    if (selectedContext?.type === 'assistant' && selectedContext.reportData) {
        const selectedIndex = messages.findIndex(m => m.id === selectedContext.id)
        const precedingUser = [...messages].slice(0, selectedIndex).reverse().find(m => m.type === 'user')
        context = {
            lastSql: selectedContext.reportData.sql || '',
            lastQuery: precedingUser?.content || '',
        }
    }

    const userMsgId = generateId()
    const botMsgId = generateId()

    // Optimistic Update
    useProjectStore.getState().addMessage({
        id: userMsgId,
        type: 'user',
        content: text,
        timestamp: Date.now(),
    } as any)

    useProjectStore.getState().addMessage({
        id: botMsgId,
        type: 'assistant',
        content: '',
        timestamp: Date.now() + 1,
        status: 'thinking',
        originalQuery: text,
    } as any)
    
    // Clear replyToId
    useProjectStore.getState().setReplyTo(null)

    try {
        if (abortController.signal.aborted) throw new Error('Generation aborted by user')

        const resolvedPrompt = resolveMentions(text)
        const planResponse = await window.electronAPI.askAI(
            resolvedPrompt,
            resolvedSchemas,
            resolvedRelations,
            context,
            language
        )

        if (abortController.signal.aborted) throw new Error('Generation aborted by user')
        if (!planResponse.success || !planResponse.data) throw new Error(planResponse.error || 'AI request failed')
        
        const plan = planResponse.data
        if (plan.status === 'error' || !plan.sql) throw new Error(plan.error || 'AI returned an error')

        const refinementHint = (plan.reasoning || '').toLowerCase().includes('modified previous sql') || !!context
        const contextRef = refinementHint && context ? { query: context.lastQuery, sqlSummary: context.lastSql } : undefined

        updateMessage(botMsgId, msg => ({
            ...msg,
            status: 'planning',
            planSql: plan.sql,
            planReasoning: plan.reasoning,
            contextRef,
        }))

        // await sleep(800) // Cinematic delay omitted for responsiveness

        if (abortController.signal.aborted) throw new Error('Generation aborted by user')

        updateMessage(botMsgId, msg => ({ ...msg, status: 'executing' }))

        const execution = await window.electronAPI.runSQL(plan.sql)
        if (!execution.success) throw new Error(execution.error || 'SQL execution failed')

        const data = execution.data ?? []
        const columns = data.length > 0 ? Object.keys(data[0]) : []
        const latency = Date.now() - startTime

        Analytics.track('analysis_generated', {
            viz_type: plan.visualization?.type || 'unknown',
            status: 'success',
        })

        updateMessage(botMsgId, msg => ({
            ...msg,
            status: undefined,
            content: plan.summary || '',
            metadata: { latency },
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

        // Auto-rename session if it's "New Session"
        const activeSessionId = useProjectStore.getState().activeSessionId
        const session = useProjectStore.getState().sessions.find(s => s.id === activeSessionId)
        if (session && session.title === 'New Session' && plan.title) {
            useProjectStore.getState().renameSession(activeSessionId, plan.title)
        }

        useProjectStore.getState().setAbortController(null)

    } catch (error: any) {
        Analytics.track('analysis_generated', {
            status: 'error',
            error_type: 'execution_failed',
        })

        updateMessage(botMsgId, msg => ({
            ...msg,
            status: 'error',
            content: `Error: ${error?.message || 'Unknown error'}`,
        }))

        useProjectStore.getState().setAbortController(null)
    }
}

const retryMessage = async (messageId: string, originalQuery: string) => {
    const { messages } = getSessionState()
    const fileState = useFileStore.getState()
    const language = useSettingsStore.getState().language || 'en'
    const readyFiles = fileState.files.filter(f => f.status === 'ready')
    const startTime = Date.now()

    const targetMsgIndex = messages.findIndex(m => m.id === messageId)
    if (targetMsgIndex === -1) return

    // Reset message status
    updateMessage(messageId, msg => ({
        ...msg,
        status: 'thinking',
        error: undefined,
        content: '',
        reportData: undefined,
    }))

    const abortController = new AbortController()
    useProjectStore.getState().setAbortController(abortController)

    const schemas = readyFiles.map(f => ({
        tableName: f.tableName || `table_${f.id}`,
        columns: f.columns,
    }))

    const relations = fileState.relations.map(rel => {
        // ... relation mapping logic same as sendMessage
         const fileA = fileState.files.find(f => f.id === rel.fileAId)
        const fileB = fileState.files.find(f => f.id === rel.fileBId)
        if (!fileA || !fileB || fileA.status !== 'ready' || fileB.status !== 'ready') return null
        return {
            sourceTable: fileA.tableName,
            sourceColumn: rel.columnA,
            targetTable: fileB.tableName,
            targetColumn: rel.columnB,
            confidence: 1,
            reason: 'User confirmed or auto-detected in session',
        } satisfies RelationSuggestion
    }).filter((r): r is RelationSuggestion => r !== null)

    const precedingMessages = messages.slice(0, targetMsgIndex)
    const contextMsg = [...precedingMessages].reverse().find(m => m.type === 'assistant' && m.reportData?.sql)
    
    let context: { lastSql: string; lastQuery: string } | undefined
    if (contextMsg?.type === 'assistant' && contextMsg.reportData) {
        const contextIndex = messages.findIndex(m => m.id === contextMsg.id)
        const precedingUser = [...messages].slice(0, contextIndex).reverse().find(m => m.type === 'user')
        context = {
            lastSql: contextMsg.reportData.sql || '',
            lastQuery: precedingUser?.content || '',
        }
    }

    try {
        if (abortController.signal.aborted) throw new Error('Generation aborted by user')
        
        const resolvedPrompt = resolveMentions(originalQuery)
        const planResponse = await window.electronAPI.askAI(resolvedPrompt, schemas, relations, context, language)

        if (abortController.signal.aborted) throw new Error('Generation aborted by user')
        if (!planResponse.success || !planResponse.data) throw new Error(planResponse.error || 'AI request failed')
        
        const plan = planResponse.data
        if (plan.status === 'error' || !plan.sql) throw new Error(plan.error || 'AI returned an error')

        updateMessage(messageId, msg => ({
            ...msg,
            status: 'planning',
            planSql: plan.sql,
            planReasoning: plan.reasoning,
        }))

        if (abortController.signal.aborted) throw new Error('Generation aborted by user')
        updateMessage(messageId, msg => ({ ...msg, status: 'executing' }))

        const execution = await window.electronAPI.runSQL(plan.sql)
        if (!execution.success) throw new Error(execution.error || 'SQL execution failed')

        const data = execution.data ?? []
        const columns = data.length > 0 ? Object.keys(data[0]) : []
        const latency = Date.now() - startTime

        Analytics.track('analysis_generated', { viz_type: plan.visualization?.type || 'unknown', status: 'success' })

        updateMessage(messageId, msg => ({
            ...msg,
            status: undefined,
            content: plan.summary || '',
            metadata: { latency },
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
        useProjectStore.getState().setAbortController(null)

    } catch (error: any) {
        Analytics.track('analysis_generated', { status: 'error', error_type: 'execution_failed' })
        updateMessage(messageId, msg => ({ ...msg, status: 'error', content: `Error: ${error?.message || 'Unknown error'}` }))
        useProjectStore.getState().setAbortController(null)
    }
}

const rerunAnalysis = async (originalMessage: ChatMessage) => {
    if (!originalMessage.originalQuery) {
        useToastStore.getState().addToast({
            type: 'error',
            title: i18n.t('error_cannot_rerun_title', { ns: 'chat' }),
            description: i18n.t('error_cannot_rerun_desc', { ns: 'chat' }),
            duration: 4000,
        })
        return
    }
    await sendMessage(originalMessage.originalQuery)
}

const autoFixMessage = async (messageId: string, error: string, originalQuery?: string, originalSql?: string) => {
    const { messages } = getSessionState()
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    updateMessage(messageId, msg => ({ ...msg, status: 'executing', content: '🔧 Attempting to auto-fix the SQL query...' }))

    try {
        const fileState = useFileStore.getState()
        const readyFiles = fileState.files.filter(f => f.status === 'ready')
        const schemas = readyFiles.map(f => ({ tableName: f.tableName || `table_${f.id}`, columns: f.columns }))

        if (!originalSql) throw new Error(i18n.t('error_no_sql_to_fix', { ns: 'chat' }))

        const fixResult = await window.electronAPI.fixSQL(originalSql, error, schemas)
        if (!fixResult.success || !fixResult.data) throw new Error(fixResult.error || i18n.t('error_failed_to_fix_sql', { ns: 'chat' }))

        const { sql: fixedSql, reasoning } = fixResult.data
        const execution = await window.electronAPI.runSQL(fixedSql)
        if (!execution.success) throw new Error(execution.error || i18n.t('error_fixed_sql_execution_failed', { ns: 'chat' }))

        const data = execution.data ?? []
        const columns = data.length > 0 ? Object.keys(data[0]) : []

        updateMessage(messageId, msg => ({
            ...msg,
            type: 'assistant',
            status: undefined,
            content: i18n.t('autofix_successful_content', { ns: 'chat' }),
            reportData: {
                title: i18n.t('autofix_fixed_title', { ns: 'chat', query: msg.originalQuery || i18n.t('autofix_fixed_query_fallback', { ns: 'chat' }) }),
                summary: i18n.t('autofix_summary', { ns: 'chat', error, reasoning }),
                sql: fixedSql,
                reasoning: (msg.planReasoning ? msg.planReasoning + '\n\n' : '') + i18n.t('autofix_reasoning', { ns: 'chat', reasoning }),
                suggestions: [],
                chartType: 'table',
                chartTitle: i18n.t('autofix_chart_title', { ns: 'chat' }),
                tableData: data,
                columns,
                vizConfig: {},
                insights: [],
            },
        }))
        useToastStore.getState().addToast({ type: 'success', title: i18n.t('autofix_success_toast_title', { ns: 'chat' }), description: i18n.t('autofix_success_toast_desc', { ns: 'chat' }), duration: 4000 })
    } catch (error: any) {
        updateMessage(messageId, msg => ({ ...msg, status: 'error', content: i18n.t('autofix_failed_content', { ns: 'chat', error: error?.message || i18n.t('error_unknown', { ns: 'chat' }) }) }))
        useToastStore.getState().addToast({ type: 'error', title: i18n.t('autofix_failed_toast_title', { ns: 'chat' }), description: error?.message || i18n.t('autofix_failed_toast_desc', { ns: 'chat' }), duration: 4000 })
    }
}

const removeMessage = (id: string) => {
    const { messages } = getSessionState()
    const index = messages.findIndex(m => m.id === id)
    if (index === -1) return

    const message = messages[index]
    const idsToRemove = [id]

    if (message.type === 'assistant') {
        if (index > 0 && messages[index - 1].type === 'user') {
            idsToRemove.push(messages[index - 1].id)
        }
    }

    idsToRemove.forEach(mid => {
        useProjectStore.getState().deleteMessage(mid)
    })
}

const reset = () => {
    const activeSessionId = useProjectStore.getState().activeSessionId
    if (activeSessionId) {
        useProjectStore.getState().clearSessionMessages(activeSessionId)
    }
}


// --- The Hook ---

export const useChatStore = <T = ChatStore>(selector?: (state: ChatStore) => T): T => {
  const projectState = useProjectStore()
  const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId)
  
  const resolvedMessages = (activeSession?.messages || []).map(m => {
      if (m.widgetId && projectState.widgetRegistry[m.widgetId]) {
          return { ...m, reportData: projectState.widgetRegistry[m.widgetId] }
      }
      return m
  }) as ChatMessage[]
  
  const state: ChatStore = {
    messages: resolvedMessages,
    history: resolvedMessages, // alias
    replyToId: activeSession?.replyToId || null,
    abortController: projectState.abortControllers[projectState.activeSessionId] || null,
    
    setReplyTo: (id) => useProjectStore.getState().setReplyTo(id),
    updateMessage,
    updateReportConfig,
    updateMessageData,
    sendMessage,
    retryMessage,
    rerunAnalysis,
    autoFixMessage,
    resetLoading,
    stopGeneration,
    removeMessage,
    reset,
  }
  
  return selector ? selector(state) : (state as unknown as T)
}

// Mock getState
useChatStore.getState = (): ChatStore => {
  const { messages, replyToId, abortController } = getSessionState()
  return {
    messages: messages as ChatMessage[],
    history: messages as ChatMessage[],
    replyToId: replyToId || null,
    abortController: abortController || null,
    setReplyTo: (id) => useProjectStore.getState().setReplyTo(id),
    updateMessage,
    updateReportConfig,
    updateMessageData,
    sendMessage,
    retryMessage,
    rerunAnalysis,
    autoFixMessage,
    resetLoading,
    stopGeneration,
    removeMessage,
    reset,
  }
}

// Mock persist
useChatStore.persist = {
    hasHydrated: () => true,
    rehydrate: () => Promise.resolve(),
    onFinishHydration: () => {}
}
