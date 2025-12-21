import React, { useState, useEffect } from 'react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-sql'
import 'prismjs/themes/prism.css'
import {
  Play,
  RotateCcw,
  Copy,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Table,
  Timer,
  Code,
  Loader2,
  Sparkles,
  Lock,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { format } from 'sql-formatter'
import { useProGate } from '@/hooks/use-pro-gate'
import { useProjectStore } from '@/stores/useProjectStore'
import { Button } from '@/components/ui/button'
import { ReportTable } from './report-table'

interface QueryPanelProps {
  sql: string
  onChange: (sql: string) => void
  initialSql: string
  initialData?: any[]
  initialColumns?: string[]
  initialColumnTypes?: Record<string, string>
  reasoning?: string
  className?: string
  runOnMount?: boolean
}

export function QueryPanel({
  sql,
  onChange,
  initialSql,
  initialData = [],
  initialColumns = [],
  initialColumnTypes = {},
  reasoning,
  className,
  runOnMount = false,
}: QueryPanelProps) {
  const { t } = useTranslation('analysis')
  const [isRunning, setIsRunning] = useState(false)
  const isRestoring = useProjectStore(s => s.isRestoring)
  const [previewData, setPreviewData] = useState<any[] | null>(
    initialData.length > 0 ? initialData : null
  )
  const [previewColumns, setPreviewColumns] = useState<string[] | null>(
    initialColumns.length > 0 ? initialColumns : null
  )
  const [previewColumnTypes, setPreviewColumnTypes] = useState<Record<string, string>>(
    initialColumnTypes
  )
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [execTime, setExecTime] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [showReasoning, setShowReasoning] = useState(true)
  const { isActivated, checkGate, gateNode } = useProGate()

  const handleRunPreview = async (queryToRun: string, bypassGate = false) => {
    if (isRestoring) return

    const run = async () => {
      setIsRunning(true)
      setPreviewError(null)
      const startTime = performance.now()
      try {
        const res = await window.electronAPI.runSQL(queryToRun)
        if (res.success && res.data) {
          const { data, columnTypes } = res.data
          setExecTime(Math.round(performance.now() - startTime))
          setPreviewData(data)
          setPreviewColumns(data.length > 0 ? Object.keys(data[0]) : [])
          setPreviewColumnTypes(columnTypes || {})
          setPreviewError(null)
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

    if (bypassGate) {
      await run()
    } else {
      checkGate(t('pro_benefit_sql', { ns: 'common' }), run)
    }
  }

  // Auto-format and run on mount if requested
  const [hasRunOnMount, setHasRunOnMount] = useState(false)
  useEffect(() => {
    if (runOnMount && !isRestoring && !hasRunOnMount) {
      setHasRunOnMount(true)
      let sqlToRun = initialSql
      try {
        const formatted = format(initialSql, {
          language: 'postgresql',
          tabWidth: 2,
          keywordCase: 'upper',
        })
        // Only update if different to avoid loop if parent updates prop
        if (formatted !== sql) {
          onChange(formatted)
        }
        sqlToRun = formatted
      } catch (e) {
        // Ignore format error
      }
      handleRunPreview(sqlToRun, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runOnMount, isRestoring, hasRunOnMount])

  const handleCopy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    onChange(initialSql)
    setPreviewError(null)
    setPreviewData(null)
    setExecTime(null)
  }

  const handleFormat = () => {
    try {
      const formatted = format(sql, {
        language: 'postgresql',
        tabWidth: 2,
        keywordCase: 'upper',
      })
      onChange(formatted)
    } catch (e) {
      // Ignore formatting errors
    }
  }

  return (
    <div className={cn("flex-1 flex flex-col min-h-0 gap-4 overflow-hidden", className)}>
      {gateNode}
      {/* EDITOR AREA */}
      <div className="flex-1 border border-zinc-200 rounded-lg overflow-hidden relative flex flex-col min-h-0 shadow-sm bg-white">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {t('sql_editor.editor_header')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {reasoning && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-500 hover:text-zinc-900"
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
            <div className="w-px h-3 bg-zinc-200 mx-1" />
            <Button
              onClick={() =>
                checkGate(t('pro_benefit_sql', { ns: 'common' }), handleFormat)
              }
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 text-xs hover:text-zinc-900',
                !isActivated ? 'text-amber-600 font-medium' : 'text-zinc-500'
              )}
            >
              {!isActivated && <Lock className="w-3 h-3 mr-1" />}
              <Sparkles className="h-3 w-3 mr-1" />
              {t('sql_editor.format')}
            </Button>
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-500 hover:text-zinc-900"
            >
              {copied ? (
                <Check className="w-3 h-3 mr-1 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              {copied ? t('sql_editor.copy_success') : t('sql_editor.copy')}
            </Button>
            <Button
              onClick={() =>
                checkGate(t('pro_benefit_sql', { ns: 'common' }), handleReset)
              }
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 text-xs hover:text-zinc-900',
                !isActivated ? 'text-amber-600 font-medium' : 'text-zinc-500'
              )}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {t('sql_editor.reset')}
            </Button>
            <div className="w-px h-4 bg-zinc-200 mx-1" />
            <Button
              size="sm"
              onClick={() => handleRunPreview(sql)}
              className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm px-3"
              disabled={isRunning || isRestoring}
            >
              {isRunning || isRestoring ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              {t('sql_editor.run')}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative overflow-auto">
          {!isActivated && (
            <div
              className="absolute inset-0 z-10 bg-zinc-100/10 backdrop-blur-[1px] flex items-center justify-center cursor-pointer group/lock"
              onClick={() =>
                checkGate(t('pro_benefit_sql', { ns: 'common' }), () => {})
              }
            >
              <div className="bg-white/90 shadow-md border border-amber-200 px-4 py-2 rounded-full flex items-center gap-2 text-amber-700 text-sm font-semibold transform transition-transform group-hover/lock:scale-105">
                <Lock className="w-4 h-4" />
                {t('unlock_pro', { ns: 'common' })}
              </div>
            </div>
          )}
          {showReasoning && reasoning && (
            <div className="m-4 mb-0 bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-900/80 animate-in slide-in-from-top-2">
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
            onValueChange={onChange}
            highlight={code =>
              Prism.highlight(
                code,
                Prism.languages.sql || Prism.languages.extend('sql', {}),
                'sql'
              )
            }
            padding={16}
            style={{
              fontFamily: '"Fira Code", "Fira Mono", monospace',
              fontSize: 13,
              backgroundColor: 'transparent',
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
      <div className="h-1/2 border border-zinc-200 rounded-lg bg-white flex flex-col overflow-hidden shadow-sm">
        <div className="bg-zinc-50/80 px-4 py-2 border-b flex justify-between items-center text-xs shrink-0">
          <div className="flex items-center gap-2 font-bold text-zinc-500 uppercase tracking-wider">
            <Table className="w-3.5 h-3.5" />
            <span>{t('sql_editor.result_preview')}</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 font-mono">
            {execTime !== null && (
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" /> {execTime}ms
              </span>
            )}
            {previewData && (
              <>
                <span className="w-px h-3 bg-zinc-200" />
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

        <div className="flex-1 overflow-auto p-0 min-h-0">
          {previewError ? (
            <div className="p-4 text-red-600 font-mono text-sm bg-red-50/30 h-full overflow-auto">
              <div className="flex items-center gap-2 mb-2 font-bold">
                <X className="w-4 h-4" />
                ERROR
              </div>
              <pre className="whitespace-pre-wrap">{previewError}</pre>
            </div>
          ) : (
            <ReportTable
              data={previewData || []}
              columns={previewColumns || []}
              columnTypes={previewColumnTypes}
              variant="preview"
            />
          )}
        </div>
      </div>
    </div>
  )
}
