import React, { useEffect, useRef, useState } from 'react'
import type { LoadingType } from '../../shared/types'
import { ChatReportCard } from './viz/containers/ChatReportCard'
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
import { VizSummary } from './viz/core/VizSummary'
import type { Message } from '@shared/types/chat'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ChatMessage = Message

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
  tableName: _tableName,
  columns: _columns = [],
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
  const username = userInfo?.username || 'User'

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    dummyDivRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  const handleQuerySubmit = (query: string) => {
    onQuerySubmit(query)
  }

  return (
    <div
      className={`flex flex-col h-full min-h-0 relative bg-gradient-to-b from-indigo-50/20 via-white/50 to-white ${className}`}
    >
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-6 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center pb-0">
            <EmptyState
              onSelectPrompt={handleQuerySubmit}
              isChatLoading={isChatLoading}
              isRestoring={isRestoring}
            />
          </div>
        ) : (
          messages.map((message, messageIdx) => (
            <MessageItem
              key={message.id || `msg-${messageIdx}`}
              message={message}
              username={username}
              isLast={messageIdx === messages.length - 1}
              isChatLoading={isChatLoading}
              isRestoring={isRestoring}
              onRemove={removeMessage}
              onConfigureTemplate={onConfigureTemplate}
              onQuerySubmit={handleQuerySubmit}
            />
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
 * Memoized Message Item to prevent unnecessary re-renders of heavy charts
 */
const MessageItem = React.memo(
  ({
    message,
    username,
    isLast,
    isChatLoading,
    isRestoring,
    onRemove,
    onConfigureTemplate,
    onQuerySubmit,
  }: {
    message: ChatMessage
    username: string
    isLast: boolean
    isChatLoading: boolean
    isRestoring: boolean
    onRemove: (id: string) => void
    onConfigureTemplate?: ChatInterfaceProps['onConfigureTemplate']
    onQuerySubmit: (query: string) => void
  }) => {
    const { t } = useTranslation('chat')
    const settings = useSettingsStore()

    // Stable handler for template configuration
    // This is CRITICAL for ChatReportCard's React.memo to work
    const handleConfigure = React.useCallback(() => {
      if (onConfigureTemplate && message.reportData) {
        onConfigureTemplate(
          message.id,
          message.reportData.template_sql || message.reportData.sql!,
          message.reportData.missing_params || [],
          message.reportData.selected_params
        )
      }
    }, [onConfigureTemplate, message.id, message.reportData])

    return (
      <div className="flex gap-4 w-full max-w-5xl mx-auto group animate-in fade-in slide-in-from-bottom-2 relative">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div
            className={cn(
              'w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm transition-transform hover:scale-105',
              message.type === 'user'
                ? 'bg-zinc-900 text-white font-bold text-[10px] ring-2 ring-white border border-white/10'
                : 'bg-white text-orange-600 border border-zinc-100 shadow-sm'
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
          <div className="flex items-center justify-between gap-2 mb-1.5 pl-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                {message.type === 'user' ? username : t('assistant')}
                {message.type === 'user' && settings.isActivated && (
                  <Crown className="w-3 h-3 text-amber-500 fill-current" />
                )}
              </span>
              <span className="text-[10px] font-medium text-zinc-400">
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
                  onClick={() => onRemove(message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-300 hover:text-red-500"
                  title={t('delete_message')}
                  aria-label="Delete message"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
          </div>

          {message.type === 'user' ? (
            <div className="text-zinc-800 font-medium text-[15px] leading-7 bg-white border border-zinc-100 px-5 py-3 rounded-[1.5rem] rounded-tl-sm shadow-sm inline-block max-w-full break-words">
              {message.content}
            </div>
          ) : (
            <div className="w-full pl-1">
              {message.contextRef && (
                <div className="flex items-center gap-1.5 mb-3 text-[10px] font-medium text-indigo-500 bg-indigo-50/50 w-fit px-2.5 py-1 rounded-full border border-indigo-100/50">
                  <GitBranch className="h-3 w-3" />
                  <span className="truncate max-w-[300px]">
                    {t('based_on')} &quot;{message.contextRef.query}&quot;
                  </span>
                </div>
              )}
              {message.status && message.status !== 'error' && (
                <div className="mb-4 rounded-[1.5rem] border border-indigo-100/60 bg-indigo-50/30 px-5 py-4 text-sm text-indigo-900/80 animate-pulse-slow">
                  <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wide opacity-80">
                    {message.status === 'planning' ||
                    message.status === 'thinking' ? (
                      <Brain className="h-3.5 w-3.5" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    {message.status === 'thinking' && t('status_thinking')}
                    {message.status === 'planning' && t('status_planning')}
                    {message.status === 'executing' && t('status_executing')}
                  </div>
                  {message.planSql && (
                    <div className="mt-3 relative group/code">
                      <pre className="max-h-48 overflow-y-auto rounded-xl bg-white/80 p-3 text-[11px] text-zinc-600 border border-indigo-100/50 font-mono leading-relaxed scrollbar-thin">
                        <code className="whitespace-pre-wrap block">
                          {(() => {
                            try {
                              return format(message.planSql, {
                                language: 'postgresql',
                              })
                            } catch {
                              return message.planSql
                            }
                          })()}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Display message content (Analysis Summary) only if NOT in reportData */}
              {message.content && !message.reportData && (
                <div className="mb-4 text-zinc-600 text-[14px] leading-7 tracking-wide">
                  <VizSummary content={message.content} />
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
                    const hasData = !!(
                      report.tableData && report.tableData.length > 0
                    )

                    // Case 1: Template waiting for configuration
                    if (isTemplate && !hasData && onConfigureTemplate) {
                      return (
                        <AnalysisTemplateCard
                          result={report as any}
                          onOpenModal={handleConfigure}
                          isExecuted={false}
                        />
                      )
                    }

                    // Case 2: Standard Report or Configured Template
                    return (
                      <>
                        <ChatReportCard
                          messageId={message.id}
                          message={message}
                          reportData={report}
                          className="w-full shadow-sm hover:shadow-md transition-shadow"
                          onConfigure={
                            isTemplate && onConfigureTemplate
                              ? handleConfigure
                              : undefined
                          }
                        />

                        {report.suggestions &&
                          report.suggestions.length > 0 && (
                            <MessageSuggestions
                              suggestions={report.suggestions}
                              isLast={isLast}
                              onSelect={onQuerySubmit}
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
    )
  }
)
MessageItem.displayName = 'MessageItem'

/**
 * Individual suggestion item with smart tooltip detection.
 */
const SuggestionItem = React.memo(({
  suggestion,
  onSelect,
  isChatLoading,
  isRestoring,
}: {
  suggestion: string
  onSelect: (query: string) => void
  isChatLoading: boolean
  isRestoring: boolean
}) => {
  const textRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  // Removed Global Resize Listener to improve performance on large lists
  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.offsetWidth)
    }
  }, [suggestion])

  const buttonContent = (
    <button
      onClick={() => {
        if (!isChatLoading && !isRestoring) {
          onSelect(suggestion)
        }
      }}
      disabled={isChatLoading || isRestoring}
      className={cn(
        'group/item flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-zinc-200 text-zinc-600 text-[12px] font-medium shadow-sm transition-all text-left overflow-hidden w-full',
        isChatLoading || isRestoring
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 hover:shadow-md active:scale-95'
      )}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover/item:bg-indigo-400 transition-colors shrink-0" />
      <span ref={textRef} className="truncate flex-1">
        {suggestion}
      </span>
    </button>
  )

  if (!isTruncated) {
    return buttonContent
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] break-words">
        {suggestion}
      </TooltipContent>
    </Tooltip>
  )
})
SuggestionItem.displayName = 'SuggestionItem'

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
    setIsExpanded(isLast)
  }, [isLast])

  return (
    <div className="flex flex-col gap-3 pt-3 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-2 pl-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all outline-none border group',
            isExpanded
              ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm'
              : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:border-zinc-300'
          )}
        >
          <Sparkles
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-300',
              isExpanded ? 'fill-current scale-110' : 'group-hover:rotate-12'
            )}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {t('suggested')}
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-300',
              isExpanded ? 'rotate-180' : 'opacity-50'
            )}
          />
        </button>

        {!isExpanded && (
          <span className="text-[10px] text-zinc-400 font-bold bg-zinc-100/50 px-2 py-0.5 rounded-md border border-zinc-100">
            {suggestions.length}
          </span>
        )}
      </div>

      {isExpanded && (
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1 animate-in fade-in slide-in-from-top-1 zoom-in-95 duration-200">
            {suggestions.map((suggestion, idx) => (
              <SuggestionItem
                key={idx}
                suggestion={suggestion}
                onSelect={onSelect}
                isChatLoading={isChatLoading}
                isRestoring={isRestoring}
              />
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}
