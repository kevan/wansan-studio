import React, { useRef, useEffect } from 'react'
import type { LoadingType } from '../../shared/types'
import { ReportCard } from './chat/ReportCard'
import { ErrorCard } from './chat/error-card'
import { EmptyState } from './chat/empty-state'
import { MagicInput } from './chat/magic-input'
import { User, Bot, Sparkles, GitBranch, Brain, Zap, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../stores/useChatStore'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  status?: 'thinking' | 'planning' | 'executing' | 'error'
  planSql?: string
  planReasoning?: string
  contextRef?: {
    query: string
    sqlSummary: string
  }
  originalQuery?: string
  metadata?: {
    latency?: number
  }
  reportData?: {
    title: string
    subtitle?: string
    summary?: string
    insights?: string[]
    sql?: string
    reasoning?: string
    suggestions?: string[]
    chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'kpi' | 'table'
    chartTitle?: string
    tableData?: Array<Record<string, any>>
    columns?: string[]
    vizConfig?: {
      x_axis?: string | null
      y_axis?: string | string[] | null
      series_name?: string
    }
  }
}

interface ChatInterfaceProps {
  tableName?: string
  columns?: string[]
  messages: ChatMessage[]
  onQuerySubmit: (query: string) => void
  loading?: LoadingType | null
  className?: string
}

export function ChatInterface({
  tableName,
  columns = [],
  messages,
  onQuerySubmit,
  loading = null,
  className = '',
}: ChatInterfaceProps) {
  const dummyDivRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('chat')
  const removeMessage = useChatStore(state => state.removeMessage)

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    dummyDivRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  const handleQuerySubmit = (query: string) => {
    onQuerySubmit(query)
  }

  return (
    <div className={`flex flex-col h-full min-h-0 relative ${className}`}>
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 pb-0 space-y-6">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center pb-0">
            <EmptyState onSelectPrompt={handleQuerySubmit} />
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className="flex gap-4 w-full max-w-5xl mx-auto group animate-in fade-in slide-in-from-bottom-2 relative"
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    message.type === 'user'
                      ? 'bg-white border border-zinc-200 text-zinc-600'
                      : 'bg-orange-50 text-orange-600 ring-1 ring-orange-100'
                  }`}
                >
                  {message.type === 'user' ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">
                      {message.type === 'user' ? t('you') : t('assistant')}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeMessage(message.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50"
                    title={t('delete_message')}
                    aria-label="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
                  </button>
                </div>

                {message.type === 'user' ? (
                  <div className="text-zinc-800 font-medium text-lg leading-relaxed">
                    {message.content}
                  </div>
                ) : (
                  <div className="w-full">
                    {message.contextRef && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-indigo-500/80 bg-indigo-50/50 w-fit px-2 py-0.5 rounded-full border border-indigo-100/50">
                        <GitBranch className="h-3 w-3" />
                        <span>
                          {t('based_on')} "{message.contextRef.query}"
                        </span>
                      </div>
                    )}
                    {message.status && message.status !== 'error' && (
                      <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-800 animate-pulse">
                        <div className="flex items-center gap-2 font-medium">
                          {message.status === 'planning' ||
                          message.status === 'thinking' ? (
                            <Brain className="h-4 w-4" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                          {message.status === 'thinking' && t('status_thinking')}
                          {message.status === 'planning' && t('status_planning')}
                          {message.status === 'executing' && t('status_executing')}
                        </div>
                        {message.planSql && (
                          <pre className="mt-2 max-h-32 overflow-y-auto rounded-md bg-white/80 p-2 text-xs text-zinc-800 border border-indigo-100">
                            <code>
                              {message.planSql.length > 400
                                ? `${message.planSql.slice(0, 400)}...`
                                : message.planSql}
                            </code>
                          </pre>
                        )}
                      </div>
                    )}

                    {message.status === 'error' && (
                      <div className="mb-4">
                        <ErrorCard message={message} />
                      </div>
                    )}
                    {message.status !== 'error' && message.content && (
                      <div className="mb-4 text-zinc-800 leading-relaxed">
                        {message.content}
                      </div>
                    )}
                    {message.reportData && (
                      <div className="w-full mt-2 space-y-4">
                        <ReportCard
                          messageId={message.id}
                          message={message}
                          reportData={message.reportData}
                          className="w-full shadow-sm hover:shadow-md transition-shadow"
                        />

                        {/* Suggestions Chips */}
                        {message.reportData.suggestions &&
                          message.reportData.suggestions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 mr-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                {t('suggested')}
                              </div>
                              {message.reportData.suggestions.map(
                                (suggestion, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() =>
                                      handleQuerySubmit(suggestion)
                                    }
                                    className="px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-600 text-xs hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 transition-colors shadow-sm"
                                  >
                                    {suggestion}
                                  </button>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Dummy div for auto-scrolling */}
        <div ref={dummyDivRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 pb-6 z-20 relative flex-none bg-transparent">
        <MagicInput
          onSubmit={handleQuerySubmit}
          loading={!!loading}
          messages={messages}
          className="pointer-events-auto"
          placeholder={t('placeholder_default')}
        />
      </div>
    </div>
  )
}
