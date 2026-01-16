import React, { useState, useEffect } from 'react'
import {
  AlertCircle,
  RefreshCw,
  Code,
  Sparkles,
  Settings,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../ui/button'
import type { ChatMessage } from '../ChatInterface'
import { useChatStore } from '../../stores/useChatStore'
import { useToastStore } from '../../stores/useToastStore'
import { useSqlLabStore } from '../../stores/useSqlLabStore'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/useSettingsStore'

interface ErrorCardProps {
  message: ChatMessage
}

export function ErrorCard({ message }: ErrorCardProps) {
  const [isFixing, setIsFixing] = useState(false)
  const [copied, setCopied] = useState(false)
  const autoFixMessage = useChatStore(state => state.autoFixMessage)
  const updateMessageData = useChatStore(state => state.updateMessageData)
  const apiKey = useSettingsStore(state => state.apiKey)
  const messages = useChatStore(state => state.messages)
  const retryMessage = useChatStore(state => state.retryMessage)
  const { t } = useTranslation('chat')

  const errorMessage = message.error || message.content || t('error_unknown')

  const handleCopy = () => {
    navigator.clipboard.writeText(errorMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (message.error === 'ERR_NO_API_KEY' && apiKey) {
      // Only retry if this is the latest message to avoid cascading retries on history
      const index = messages.findIndex(m => m.id === message.id)
      const isLatest = index === messages.length - 1

      if (isLatest && index > 0) {
        const prevMsg = messages[index - 1]
        if (prevMsg.type === 'user') {
          retryMessage(message.id, prevMsg.content)
        }
      }
    }
  }, [apiKey, message.error, message.id, messages, retryMessage])

  const hasSql = !!message.reportData?.sql || !!message.planSql

  const originalQuery = message.originalQuery

  const originalSql = message.reportData?.sql || message.planSql

  const isSqlError = !!originalSql

  // [NEW] Handle Missing Key Case

  if (message.error === 'ERR_NO_API_KEY') {
    return (
      <div className="border border-zinc-200 bg-white rounded-lg p-8 w-full flex flex-col items-center text-center shadow-sm">
        {/* Icon - Keep Accent Here */}

        <div className="bg-indigo-50 p-3 rounded-full mb-4">
          <KeyRound className="h-6 w-6 text-indigo-600" />
        </div>

        {/* Title - Primary Text */}

        <h3 className="font-bold text-lg text-zinc-900 mb-2">
          {t('error_api_key_required_title')}
        </h3>

        {/* Description - Secondary Text */}

        <p className="text-zinc-500 mb-6 leading-relaxed max-w-sm">
          {t('error_api_key_required_description')}
        </p>

        {/* Button - PRIMARY BLACK */}

        <Button
          className="gap-2 bg-black hover:bg-zinc-800 text-white px-6 h-10 rounded-md shadow-md"
          onClick={() =>
            document.dispatchEvent(new CustomEvent('open-settings'))
          }
        >
          <Settings className="h-4 w-4" />

          {t('error_go_to_settings')}
        </Button>
      </div>
    )
  }

  const handleAutoFix = async () => {
    if (!originalSql || !originalQuery) {
      useToastStore.getState().addToast({
        type: 'error',

        title: t('error_cannot_autofix_title'),

        description: t('error_cannot_autofix_desc'),

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

  const handleRunSql = async (newSql: string) => {
    const result = await window.electronAPI.runSQL(newSql)

    if (result.success && result.data) {
      const { data, columnFields } = result.data

      updateMessageData(message.id, newSql, data, columnFields)
    } else {
      throw new Error(result.error || 'Execution failed')
    }
  }

  const handleEditSql = () => {
    useSqlLabStore.getState().open({
      mode: 'widget',

      targetId: message.id,

      targetTitle: t('error_edit_sql'),

      initialSql: originalSql || '',

      onSave: handleRunSql,
    })
  }

  return (
    <div className="border border-red-100 bg-red-50/30 rounded-xl overflow-hidden my-4 shadow-sm">
      {/* Header Section */}

      <div className="px-5 py-4 flex items-start gap-4 border-b border-red-100/50 bg-red-50/50">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-sm">
          {isSqlError ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-black text-sm uppercase tracking-tight text-red-900">
            {isSqlError
              ? t('error_analysis_failed')
              : t('error_ai_failed', 'AI Analysis Failed')}
          </h3>

          <p className="text-xs font-medium text-red-700/70 leading-relaxed">
            {isSqlError
              ? t('error_processing_request')
              : t(
                  'error_ai_desc',
                  'The assistant could not process your query'
                )}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4 bg-white/40">
        {/* Error Details - Terminal Style */}

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-red-400/80">
              {t('error_details')}
            </div>

            <button
              onClick={handleCopy}
              className="text-zinc-400 hover:text-red-500 transition-colors"
              title="Copy error"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-800 shadow-inner group/log relative">
            <pre className="text-[11px] font-mono text-rose-300/90 leading-relaxed overflow-x-auto max-h-48 whitespace-pre-wrap break-words scrollbar-thin">
              {errorMessage}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}

        {(isSqlError || hasSql) && (
          <div className="flex items-center gap-2 pt-1">
            {originalSql && originalQuery && (
              <Button
                onClick={handleAutoFix}
                disabled={isFixing}
                size="sm"
                className={cn(
                  'bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold h-9 px-4 rounded-xl shadow-lg shadow-orange-100 transition-all active:scale-95',

                  isFixing && 'opacity-60 cursor-not-allowed'
                )}
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />

                    {t('error_auto_fixing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-2" />{' '}
                    {t('error_auto_fix')}
                  </>
                )}
              </Button>
            )}

            {hasSql && (
              <Button
                onClick={handleEditSql}
                size="sm"
                variant="outline"
                className="text-xs font-bold h-9 px-4 rounded-xl bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all active:scale-95"
              >
                <Code className="h-3.5 w-3.5 mr-2 text-zinc-500" />

                {t('error_edit_sql')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
