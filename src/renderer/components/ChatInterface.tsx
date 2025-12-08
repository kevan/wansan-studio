import React, { useState, useRef, useEffect } from 'react'
import { MagicInput } from './MagicInput'
import { QuickCommands, QuickCommand, defaultQuickCommands } from './QuickCommands'
import { AutocompleteInput, AutocompleteOption } from './AutocompleteInput'
import { LoadingState, LoadingType } from './LoadingStates'
import { ReportCard } from './chat/ReportCard'
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
    sql?: string;
    reasoning?: string;
    suggestions?: string[];
    chartType?: 'bar' | 'line' | 'pie' | 'area'
    chartTitle?: string
    tableData?: Array<Record<string, any>>
    vizConfig?: {
        x_axis: string
        y_axis: string
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
  className = ""
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [useAutocomplete, setUseAutocomplete] = useState(false)
  const dummyDivRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    dummyDivRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  // 生成自动完成选项
  const autocompleteOptions: AutocompleteOption[] = [
    // 列名选项
    ...columns.map(col => ({
      id: `col-${col}`,
      label: col,
      value: `[${col}]`,
      type: 'column' as const,
      description: `表列: ${col}`
    })),
    // 常用函数
    {
      id: 'sum',
      label: '求和',
      value: 'SUM(',
      type: 'function' as const,
      description: '计算数值总和'
    },
    {
      id: 'avg',
      label: '平均值',
      value: 'AVG(',
      type: 'function' as const,
      description: '计算平均值'
    },
    {
      id: 'count',
      label: '计数',
      value: 'COUNT(',
      type: 'function' as const,
      description: '统计记录数量'
    },
    // 关键词
    {
      id: 'group-by',
      label: '分组',
      value: '按 ',
      type: 'keyword' as const,
      description: '按某个字段分组'
    },
    {
      id: 'order-by',
      label: '排序',
      value: '按 ',
      type: 'keyword' as const,
      description: '按某个字段排序'
    }
  ]

  const handleQuerySubmit = (query: string) => {
    setInputValue('')
    // 调用外部处理函数
    onQuerySubmit(query)
  }

  const handleQuickCommand = (command: QuickCommand) => {
    handleQuerySubmit(command.query)
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              开始对话
            </h3>
            <p className="text-gray-600 mb-6">
              使用自然语言描述您想要的报表，或选择下方的快捷指令
            </p>
            
            {/* 快捷指令 */}
            <QuickCommands 
              onCommandClick={handleQuickCommand}
              disabled={!tableName}
              className="max-w-2xl mx-auto"
            />
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-4 w-full max-w-5xl group">
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' ? 'bg-zinc-100 text-zinc-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {message.type === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-900">
                    {message.type === 'user' ? 'You' : 'Wansan AI'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {message.type === 'user' ? (
                  <div className="text-zinc-800 font-medium text-lg leading-relaxed">
                    {message.content}
                  </div>
                ) : (
                  <div className="w-full">
                    {message.content && <div className="mb-4 text-zinc-800">{message.content}</div>}
                    {message.reportData && (
                      <div className="w-full mt-2 space-y-4">
                        <ReportCard 
                          messageId={message.id} 
                          reportData={message.reportData} 
                          className="w-full"
                        />
                        
                        {/* Suggestions Chips */}
                        {message.reportData.suggestions && message.reportData.suggestions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 mr-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              Suggested:
                            </div>
                            {message.reportData.suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQuerySubmit(suggestion)}
                                className="px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-600 text-xs hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 transition-colors shadow-sm"
                              >
                                {suggestion}
                              </button>
                            ))}
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
          <div className="flex gap-4 w-full max-w-5xl">
            <div className="flex-shrink-0 mt-1">
               <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
               </div>
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-900">Wansan AI</span>
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
      <div className="border-t bg-white p-4">
        {/* 快捷指令（有数据时显示） */}
        {tableName && messages.length > 0 && (
          <div className="mb-4">
            <QuickCommands 
              onCommandClick={handleQuickCommand}
              disabled={!!loading}
              maxVisible={4}
            />
          </div>
        )}
        
        {/* 输入框切换 */}
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => setUseAutocomplete(false)}
            className={`text-sm px-2 py-1 rounded ${!useAutocomplete ? 'bg-orange-100 text-orange-700' : 'text-gray-600'}`}
          >
            简单模式
          </button>
          <button
            onClick={() => setUseAutocomplete(true)}
            className={`text-sm px-2 py-1 rounded ${useAutocomplete ? 'bg-orange-100 text-orange-700' : 'text-gray-600'}`}
          >
            智能提示
          </button>
        </div>
        
        {/* 输入框 */}
        {useAutocomplete ? (
          <AutocompleteInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleQuerySubmit}
            options={autocompleteOptions}
            disabled={!!loading}
            placeholder={tableName ? `分析 ${tableName} 表的数据...` : "请先上传数据文件"}
          />
        ) : (
          <MagicInput
            onSubmit={handleQuerySubmit}
            disabled={!!loading}
            placeholder={tableName ? `分析 ${tableName} 表的数据...` : "请先上传数据文件"}
          />
        )}
      </div>
    </div>
  )
}
