import React, { useEffect, useRef, useState } from 'react'
import type { LoadingType } from '../../shared/types'
import { ReportCard } from './chat/ReportCard'
import { ErrorCard } from './chat/error-card'
import { EmptyState } from './chat/empty-state'
import { MagicInput } from './chat/magic-input'
import {
  Bot,
  Brain,
  ChevronDown,
  Crown,
  GitBranch,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../stores/useChatStore'
import { useUserInfo } from '../hooks/useIPC'
import { useSettingsStore } from '../stores/useSettingsStore'
import { cn } from '@/utils/cn'
import { format } from 'sql-formatter'

import { AnalysisTemplateCard } from './chat/analysis-template-card'
import { FilterParam } from '@shared/schemas/analysis'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  hiddenPrompt?: string
  timestamp: number
  status?: 'thinking' | 'planning' | 'executing' | 'error'
  error?: string
  planSql?: string
  planReasoning?: string
  contextRef?: {
    query: string
    sqlSummary: string
  }
  originalQuery?: string
  metadata?: {
    aiLatency?: number
    dbLatency?: number
    latency?: number
  }
  widgetId?: string
  reportData?: any
}

interface ChatInterfaceProps {
  tableName?: string
  columns?: string[]
  messages: ChatMessage[]
  onQuerySubmit: (query: string) => void
  onConfigureTemplate?: (
    messageId: string,
    templateSql: string,
    params: FilterParam[],
    initialValues?: Record<string, string[]>
  ) => void
  loading?: LoadingType | null
  className?: string
}

export function ChatInterface({
  tableName,
  columns = [],
  messages,
  onQuerySubmit,
  onConfigureTemplate,
  loading = null,
  className = '',
}: ChatInterfaceProps) {
  const dummyDivRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('chat')
  const removeMessage = useChatStore(state => state.removeMessage)
  const isChatLoading = useChatStore(state => !!state.abortController)
  const isRestoring = !useChatStore.persist.hasHydrated()
  const { data: userInfo } = useUserInfo()
  const settings = useSettingsStore()
  const username = userInfo?.username || 'User'

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
            <EmptyState
              onSelectPrompt={handleQuerySubmit}
              isChatLoading={isChatLoading}
              isRestoring={isRestoring}
            />
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={message.id || `msg-${idx}`}
              className="flex gap-4 w-full max-w-5xl mx-auto group animate-in fade-in slide-in-from-bottom-2 relative"
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shadow-sm',
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-[10px] ring-1 ring-white/20 border border-white/10'
                      : 'bg-orange-50 text-orange-600 ring-1 ring-orange-100'
                  )}
                >
                  {message.type === 'user' ? (
                    username.slice(0, 2).toUpperCase()
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                      {message.type === 'user' ? username : t('assistant')}
                      {message.type === 'user' && settings.isActivated && (
                        <Crown className="w-3 h-3 text-yellow-500 fill-current" />
                      )}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Delete Button */}
                  {message.type !== 'user' &&
                    !['thinking', 'planning', 'executing'].includes(
                      message.status || ''
                    ) && (
                      <button
                        onClick={() => removeMessage(message.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50"
                        title={t('delete_message')}
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
                      </button>
                    )}
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
                          {message.status === 'thinking' &&
                            t('status_thinking')}
                          {message.status === 'planning' &&
                            t('status_planning')}
                          {message.status === 'executing' &&
                            t('status_executing')}
                        </div>
                        {message.planSql && (
                          <pre className="mt-2 max-h-48 overflow-y-auto rounded-md bg-white/80 p-3 text-xs text-zinc-800 border border-indigo-100 font-mono leading-relaxed scrollbar-thin">
                            <code className="whitespace-pre-wrap block">
                              {(() => {
                                try {
                                  return format(message.planSql, {
                                    language: 'postgresql',
                                  })
                                } catch (e) {
                                  return message.planSql
                                }
                              })()}
                            </code>
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Display message content (Analysis Summary) */}
                    {(message.content || message.reportData?.summary) && (
                      <div className="mb-3 text-zinc-600 text-[14px] leading-relaxed">
                        {message.content || message.reportData?.summary}
                      </div>
                    )}

                    {message.status === 'error' && (
                      <div className="mb-4">
                        <ErrorCard message={message} />
                      </div>
                    )}

                    {message.reportData && (
                      <div className="w-full mt-2 space-y-2">
                        {(() => {
                          const report = message.reportData!
                          const isTemplate = !!report.is_template
                          const hasData = !!(report.tableData && report.tableData.length > 0)

                          // Case 1: Template waiting for configuration
                          if (isTemplate && !hasData && onConfigureTemplate) {
                            return (
                              <AnalysisTemplateCard
                                result={report as any}
                                onOpenModal={() =>
                                  onConfigureTemplate(
                                    message.id,
                                    report.sql!,
                                    report.missing_params || [],
                                    report.selected_params
                                  )
                                }
                                isExecuted={false}
                              />
                            )
                          }

                          // Case 2: Standard Report or Configured Template
                          return (
                            <>
                              <ReportCard
                                messageId={message.id}
                                message={message}
                                reportData={report}
                                className="w-full shadow-sm hover:shadow-md transition-shadow"
                                onConfigure={
                                  isTemplate && onConfigureTemplate
                                    ? () =>
                                        onConfigureTemplate(
                                          message.id,
                                          report.sql!,
                                          report.missing_params || [],
                                          report.selected_params
                                        )
                                    : undefined
                                }
                              />

                              {report.suggestions && report.suggestions.length > 0 && (
                                <MessageSuggestions
                                  suggestions={report.suggestions}
                                  isLast={idx === messages.length - 1}
                                  onSelect={handleQuerySubmit}
                                  isChatLoading={isChatLoading}
                                  isRestoring={isRestoring}
                                />
                              )}
                            </>
                          )
                        })()}
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

/**
 * Collapsible suggestions component.
 */
function MessageSuggestions({
  suggestions,
  isLast,
  onSelect,
  isChatLoading,
  isRestoring,
}: {
  suggestions: string[]
  isLast: boolean
  onSelect: (query: string) => void
  isChatLoading: boolean
  isRestoring: boolean
}) {
  const { t } = useTranslation('chat')
  const [isExpanded, setIsExpanded] = useState(isLast)

  useEffect(() => {
    if (isLast) setIsExpanded(true)
  }, [isLast])

  return (
    <div className="flex flex-col gap-3 pt-3 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md transition-all outline-none border group',
            isExpanded
              ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
              : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:border-zinc-300'
          )}
        >
          <Sparkles
            className={cn(
              'w-3 h-3 transition-transform duration-300',
              isExpanded ? 'fill-current scale-110' : 'group-hover:rotate-12'
            )}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {t('suggested')}
          </span>
          <ChevronDown
            className={cn(
              'w-3 h-3 transition-transform duration-300',
              isExpanded ? 'rotate-180' : 'opacity-50'
            )}
          />
        </button>

        {!isExpanded && (
          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-100/50 px-1.5 py-0.5 rounded border border-zinc-100">
            {suggestions.length}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 zoom-in-95 duration-200">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!isChatLoading && !isRestoring) {
                  onSelect(suggestion)
                  setIsExpanded(false)
                }
              }}
              disabled={isChatLoading || isRestoring}
              className={cn(
                'px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-600 text-xs shadow-sm transition-all',
                isChatLoading || isRestoring
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md hover:shadow-indigo-500/10 active:scale-95'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
