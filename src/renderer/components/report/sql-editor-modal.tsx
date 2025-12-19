import React, { useState, useEffect } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-sql'
import 'prismjs/themes/prism.css'
import {
  Play,
  RotateCcw,
  Copy,
  X,
  Check,
  AlignLeft,
  Sparkles,
  Lock,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { format } from 'sql-formatter'
import { useToastStore } from '@/stores/useToastStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useProGate } from '@/hooks/use-pro-gate'

interface SqlEditorModalProps {
  isOpen: boolean
  onClose: () => void
  initialSql: string
  reasoning?: string
  onRun: (sql: string) => Promise<void>
}

export function SqlEditorModal({
  isOpen,
  onClose,
  initialSql,
  reasoning,
  onRun,
}: SqlEditorModalProps) {
  const { t } = useTranslation('analysis')
  const [sql, setSql] = useState(initialSql)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const addToast = useToastStore(state => state.addToast)
  const { isActivated, checkGate, gateNode } = useProGate()

  // Auto-format SQL when modal opens
  useEffect(() => {
    if (initialSql) {
      try {
        const formatted = format(initialSql, {
          language: 'postgresql',
          tabWidth: 2,
          keywordCase: 'upper',
        })
        setSql(formatted)
      } catch (e) {
        // Fallback if format fails
        setSql(initialSql)
      }
    }
  }, [initialSql])

  if (!isOpen) return null

  const handleRun = async () => {
    setIsRunning(true)
    setError(null)
    const startTime = performance.now()
    try {
      await onRun(sql)
      const duration = Math.round(performance.now() - startTime)
      addToast({
        title: t('sql_editor.run_success'),
        description: `${t('sql_editor.execution_time')}: ${duration}ms`,
        type: 'success',
        duration: 3000,
      })
    } catch (e: any) {
      setError(e.message || 'Execution failed')
    } finally {
      setIsRunning(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setSql(initialSql)
    setError(null)
  }

  const handleFormat = () => {
    try {
      const formatted = format(sql, {
        language: 'postgresql',
        tabWidth: 2,
        keywordCase: 'upper',
      })
      setSql(formatted)
    } catch (e) {
      // Ignore formatting errors
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {gateNode}
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <h3 className="font-semibold text-zinc-800">Analysis Inspector</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden p-1">
          {reasoning && (
            <div className="flex-none bg-indigo-50/50 border border-indigo-100 p-4 rounded-lg text-sm text-indigo-900/80 max-h-[30%] overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <h4 className="font-semibold text-xs tracking-wide uppercase text-indigo-400">
                  AI Reasoning
                </h4>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap font-medium">
                {reasoning}
              </p>
            </div>
          )}

          <div className="flex-1 border border-zinc-200 rounded-md overflow-hidden flex flex-col shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-zinc-50">
              <span className="text-xs font-bold text-zinc-500">
                SQL EDITOR
              </span>
              <button
                onClick={() => checkGate('SQL Editor', handleFormat)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors border border-transparent',
                  !isActivated
                    ? 'text-zinc-400'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 hover:border-zinc-300'
                )}
                title="Format Code"
              >
                {!isActivated && <Lock className="w-3 h-3 mr-1" />}
                <AlignLeft className="h-3 w-3" />
                Format
              </button>
            </div>
            <div className="flex-1 min-h-0 relative overflow-auto bg-zinc-50/30">
              <Editor
                value={sql}
                onValueChange={setSql}
                highlight={code => highlight(code, languages.sql, 'sql')}
                padding={16}
                readOnly={!isActivated}
                style={{
                  fontFamily: '"Fira Code", "Fira Mono", monospace',
                  fontSize: 14,
                  backgroundColor: '#f9f9f9',
                  minHeight: '100%',
                }}
                className={cn(
                  'min-h-full',
                  !isActivated && 'opacity-80 bg-zinc-50 cursor-not-allowed'
                )}
              />
              {!isActivated && (
                <button
                  onClick={() => checkGate('SQL Editor', () => {})}
                  className="absolute bottom-4 right-4 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-md flex items-center gap-1.5 border border-yellow-200 shadow-sm z-10 hover:bg-yellow-200 transition-colors"
                >
                  <Lock className="w-3 h-3" />
                  <span className="font-medium">Unlock Editor (Pro)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-t border-red-100 font-mono overflow-auto max-h-24">
            {error}
          </div>
        )}

        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => checkGate('SQL Editor', handleReset)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors border border-transparent',
                !isActivated
                  ? 'text-zinc-400'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 hover:border-zinc-300'
              )}
            >
              {!isActivated && <Lock className="w-3 h-3" />}
              <RotateCcw className="w-4 h-4" />
              {t('sql_editor.reset')}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors border border-transparent hover:border-zinc-300"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? t('sql_editor.copy_success') : t('sql_editor.copy')}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-all shadow-sm',
                isRunning
                  ? 'bg-zinc-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow'
              )}
            >
              {isRunning ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {t('sql_editor.run')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
