import React, { useRef, useEffect } from 'react'
import { LoadingState, LoadingType } from './LoadingStates'
import { ReportCard } from './chat/ReportCard'
import { EmptyState } from './chat/empty-state'
import { InputBar } from './chat/input-bar'
import { User, Bot, Sparkles } from 'lucide-react'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
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

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    dummyDivRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  const handleQuerySubmit = (query: string) => {
    onQuerySubmit(query)
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <EmptyState onSelectPrompt={handleQuerySubmit} />
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className="flex gap-4 w-full max-w-5xl mx-auto group animate-in fade-in slide-in-from-bottom-2"
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-900">
                    {message.type === 'user' ? 'You' : 'Wansan AI'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {message.type === 'user' ? (
                  <div className="text-zinc-800 font-medium text-lg leading-relaxed">
                    {message.content}
                  </div>
                ) : (
                  <div className="w-full">
                    {message.content && (
                      <div className="mb-4 text-zinc-800 leading-relaxed">
                        {message.content}
                      </div>
                    )}
                    {message.reportData && (
                      <div className="w-full mt-2 space-y-4">
                        <ReportCard
                          messageId={message.id}
                          reportData={message.reportData}
                          className="w-full shadow-sm hover:shadow-md transition-shadow"
                        />

                        {/* Suggestions Chips */}
                        {message.reportData.suggestions &&
                          message.reportData.suggestions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 mr-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                Suggested:
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

        {/* 加载状态 */}
        {loading && (
          <div className="flex gap-4 w-full max-w-5xl mx-auto animate-in fade-in">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center ring-1 ring-orange-100">
                <Bot className="w-5 h-5" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-zinc-900">
                  Wansan AI
                </span>
              </div>
              <div className="max-w-md">
                <LoadingState type={loading} />
              </div>
            </div>
          </div>
        )}

        {/* Dummy div for auto-scrolling */}
        <div ref={dummyDivRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 z-10 relative">
        <InputBar
          onSubmit={handleQuerySubmit}
          loading={!!loading}
          tableName={tableName}
          columns={columns}
          placeholder={
            tableName
              ? `关于 ${tableName}，你想知道什么？`
              : '请先选择或上传数据文件...'
          }
        />
      </div>
    </div>
  )
}
