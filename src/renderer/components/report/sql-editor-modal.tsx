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
  ChevronUp,
  ChevronDown,
  Table,
  Timer,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { format } from 'sql-formatter'
import { useToastStore } from '@/stores/useToastStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useProGate } from '@/hooks/use-pro-gate'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReportTable } from './report-table'

interface SqlEditorModalProps {
  isOpen: boolean
  onClose: () => void
  initialSql: string
  initialData?: any[]
  initialColumns?: string[]
  reasoning?: string
  onSave: (sql: string) => Promise<void>
}

export function SqlEditorModal({
  isOpen,
  onClose,
  initialSql,
  initialData = [],
  initialColumns = [],
  reasoning,
  onSave,
}: SqlEditorModalProps) {
  const { t } = useTranslation('analysis')
  const [sql, setSql] = useState(initialSql)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [previewColumns, setPreviewColumns] = useState<string[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [execTime, setExecTime] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [showReasoning, setShowReasoning] = useState(true)
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

  const handleRunPreview = async () => {
    setIsRunning(true)
    setPreviewError(null)
    const startTime = performance.now()
    try {
      const res = await window.electronAPI.runSQL(sql)
      if (res.success) {
        setExecTime(Math.round(performance.now() - startTime))
        setPreviewData(res.data)
        if (res.data && res.data.length > 0) {
          setPreviewColumns(Object.keys(res.data[0]))
        } else {
          setPreviewColumns([])
        }
      } else {
        throw new Error(res.error)
      }
    } catch (e: any) {
      setPreviewError(e.message || 'Execution failed')
      setPreviewData([])
      setPreviewColumns([])
    } finally {
      setIsRunning(false)
    }
  }

  const handleSave = async () => {
    await onSave(sql)
    onClose()
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={e => e.preventDefault()}
      >
        {gateNode}
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{t('sql_editor.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 gap-4 p-4">
          {/* EDITOR AREA */}
          <div className="flex-1 border rounded-md overflow-hidden relative flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-zinc-50">
              <span className="text-xs font-bold text-zinc-500">
                {t('sql_editor.editor_header')}
              </span>
              <div className="flex items-center gap-2">
                {reasoning && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-zinc-500"
                    onClick={() => setShowReasoning(!showReasoning)}
                  >
                    {showReasoning ? (
                      <ChevronUp className="w-3 h-3 mr-1" />
                    ) : (
                      <ChevronDown className="w-3 h-3 mr-1" />
                    )}
                    {showReasoning
                      ? t('sql_editor.hide_logic')
                      : t('sql_editor.show_logic')}
                  </Button>
                )}
                <Button
                  onClick={() => checkGate('SQL Editor', handleFormat)}
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  disabled={!isActivated}
                >
                  {!isActivated && <Lock className="w-3 h-3 mr-1" />}
                  <AlignLeft className="h-3 w-3 mr-1" />
                  {t('sql_editor.format')}
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative overflow-auto bg-zinc-50/30">
              {showReasoning && reasoning && (
                <div className="m-4 bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-900/80 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    <span className="font-semibold tracking-wide uppercase text-indigo-400">
                      {t('sql_editor.ai_reasoning')}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap font-medium italic">
                    {reasoning}
                  </p>
                </div>
              )}
              <Editor
                value={sql}
                onValueChange={setSql}
                highlight={code => highlight(code, languages.sql, 'sql')}
                padding={16}
                readOnly={!isActivated}
                style={{
                  fontFamily: '"Fira Code", "Fira Mono", monospace',
                  fontSize: 14,
                  backgroundColor: '#fafafa',
                  minHeight: '100%',
                }}
                className={cn(
                  'min-h-full',
                  !isActivated && 'opacity-80 bg-zinc-100 cursor-not-allowed'
                )}
              />
            </div>
          </div>

          {/* PREVIEW AREA */}
          <div className="h-1/2 border rounded-md bg-white flex flex-col overflow-hidden">
            <div className="bg-zinc-100/80 px-4 py-2 border-b flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-600">
                <Table className="w-3 h-3" />
                <span>{t('sql_editor.result_preview')}</span>
              </div>

              <div className="flex items-center gap-3 text-zinc-500 font-mono">
                {execTime !== null && (
                  <span className="flex items-center gap-1">
                    <Timer className="w-3 h-3" /> {execTime}ms
                  </span>
                )}
                {previewData && (
                  <>
                    <span className="w-px h-3 bg-zinc-300" />
                    <span>
                      {previewData.length} {t('sql_editor.rows_suffix')}
                    </span>
                    <span>x</span>
                    <span>
                      {Object.keys(previewData[0] || {}).length}{' '}
                      {t('field_name', { ns: 'common' })}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
              {previewError ? (
                <div className="p-4 text-red-600 font-mono text-sm">
                  {previewError}
                </div>
              ) : (
                <ReportTable
                  data={previewData || initialData}
                  columns={previewColumns || initialColumns}
                  variant="dashboard"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-zinc-50">
          <Button variant="outline" onClick={onClose}>
            {t('sql_editor.cancel')}
          </Button>
          <Button
            onClick={handleRunPreview}
            variant="secondary"
            disabled={isRunning}
          >
            {isRunning ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {t('sql_editor.run')}
          </Button>
          <Button onClick={handleSave}>{t('sql_editor.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
