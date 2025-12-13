import React, { useState } from 'react'
import { AlertCircle, RefreshCw, Code, Sparkles } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../ui/button'
import type { ChatMessage } from '../ChatInterface'
import { useChatStore } from '../../stores/useChatStore'
import { useToastStore } from '../../stores/useToastStore'
import { SqlEditorModal } from '../report/sql-editor-modal'
import { useTranslation } from 'react-i18next'

interface ErrorCardProps {
  message: ChatMessage
}

export function ErrorCard({ message }: ErrorCardProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const autoFixMessage = useChatStore(state => state.autoFixMessage)
  const updateMessageData = useChatStore(state => state.updateMessageData)
  const { t } = useTranslation('common')

  const errorMessage = message.content || 'Unknown error occurred'
  const hasSql = !!message.reportData?.sql
  const originalQuery = message.originalQuery
  const originalSql = message.reportData?.sql

  const handleAutoFix = async () => {
    if (!originalSql || !originalQuery) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Cannot Auto-Fix',
        description: 'Missing original query or SQL statement.',
        duration: 4000,
      })
      return
    }

    setIsFixing(true)
    try {
      await autoFixMessage(message.id, errorMessage, originalQuery, originalSql)
    } finally {
      setIsFixing(false)
    }
  }

  const handleEditSql = () => {
    setIsEditorOpen(true)
  }

  const handleRunSql = async (newSql: string) => {
    const result = await window.electronAPI.runSQL(newSql)
    if (result.success && result.data) {
      const columns = result.data.length > 0 ? Object.keys(result.data[0]) : []
      updateMessageData(message.id, newSql, result.data, columns)
    } else {
      throw new Error(result.error || 'Execution failed')
    }
  }

  return (
    <div className="border border-red-200 bg-red-50/70 rounded-lg p-4 my-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-red-800">分析失败</h3>
            <p className="text-xs text-red-600 mt-1">
              在处理您的请求时遇到了问题
            </p>
          </div>
        </div>
      </div>

      {/* Error Details */}
      <div className="mb-3">
        <div className="bg-white/70 border border-red-100 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-red-700">错误详情</span>
          </div>
          <pre className="text-xs text-red-800 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
            {errorMessage}
          </pre>
        </div>
      </div>

      {/* Original Query (if available) */}
      {originalQuery && (
        <div className="mb-3">
          <div className="bg-white/70 border border-zinc-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-700">原始提问</span>
            </div>
            <p className="text-xs text-zinc-600">{originalQuery}</p>
          </div>
        </div>
      )}

      {/* Original SQL (if available) */}
      {hasSql && (
        <div className="mb-3">
          <div className="bg-white/70 border border-zinc-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-700">生成的 SQL</span>
            </div>
            <pre className="text-xs text-zinc-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-zinc-50 p-2 rounded">
              <code>{originalSql}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleAutoFix}
          disabled={isFixing}
          size="sm"
          className={cn(
            'bg-orange-500 hover:bg-orange-600 text-white text-xs h-7 px-3',
            isFixing && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isFixing ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              正在修复...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              ✨ 自动修复
            </>
          )}
        </Button>

        <Button
          onClick={handleEditSql}
          size="sm"
          variant="outline"
          className="text-xs h-7 px-3"
        >
          <Code className="h-3 w-3 mr-1" />
          编辑 SQL
        </Button>
      </div>

      {/* SQL Editor Modal */}
      {hasSql && (
        <SqlEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialSql={originalSql || ''}
          reasoning={message.reportData?.reasoning}
          onRun={handleRunSql}
        />
      )}
    </div>
  )
}
