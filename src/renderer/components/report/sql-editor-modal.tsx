import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play, RotateCcw, Copy, X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

interface SqlEditorModalProps {
  isOpen: boolean
  onClose: () => void
  initialSql: string
  onRun: (sql: string) => Promise<void>
}

export function SqlEditorModal({ isOpen, onClose, initialSql, onRun }: SqlEditorModalProps) {
  const { t } = useTranslation('analysis')
  const [sql, setSql] = useState(initialSql)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleRun = async () => {
    setIsRunning(true)
    setError(null)
    try {
      await onRun(sql)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <h3 className="font-semibold text-zinc-800 flex items-center gap-2">
            <span className="text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded text-xs">SQL</span>
            {t('sql_editor.title')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={sql}
            onChange={(val) => setSql(val || '')}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              automaticLayout: true,
            }}
          />
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-t border-red-100 font-mono overflow-auto max-h-24">
            {error}
          </div>
        )}

        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors border border-transparent hover:border-zinc-300"
            >
              <RotateCcw className="w-4 h-4" />
              {t('sql_editor.reset')}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors border border-transparent hover:border-zinc-300"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? t('sql_editor.copy_success') : 'Copy'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-all shadow-sm",
                isRunning ? "bg-zinc-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow"
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
