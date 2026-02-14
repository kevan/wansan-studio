import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileNode, ColumnSchema } from '@shared/types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Edit2, Eye, EyeOff, Key, Sparkles, RefreshCcw } from 'lucide-react'
import { cn } from '@/utils/cn'
import { COLUMN_TYPE_CONFIG } from '@/src/lib/constants'
import { useProjectStore } from '@/stores/useProjectStore'
import { useToastStore } from '@/stores/useToastStore'
import { SemanticEditorModal } from '../modals/SemanticEditorModal'
import { AIExtractorDialog } from '../modals/AIExtractorDialog'

interface ColumnsViewProps {
  file: FileNode
  initialExtractColumn?: ColumnSchema | null
}

export function ColumnsView({ file, initialExtractColumn }: ColumnsViewProps) {
  const { t } = useTranslation('common')
  const toast = useToastStore()
  
  const updateColumnSemantic = useProjectStore(s => s.updateColumnSemantic)
  const refreshMetadata = useProjectStore(s => s.refreshFileMetadata)
  
  const [editingColumn, setEditingColumn] = useState<ColumnSchema | null>(null)
  const [aiExtractColumn, setAiExtractColumn] = useState<ColumnSchema | null>(initialExtractColumn || null)
  const [activeHint, setActiveHint] = useState<{ prompt: string; targetColumnName: string } | null>(null)

  // Sync with prop change (for cross-tab trigger)
  React.useEffect(() => {
    if (initialExtractColumn) {
      setAiExtractColumn(initialExtractColumn)
    }
  }, [initialExtractColumn])

  // [V1.7.5] Auto-refresh when AI extraction completes
  React.useEffect(() => {
    const removeListener = window.electronAPI.onBatchComplete((data: any) => {
       if (data.tableName === file.tableName) {
          console.log('[ColumnsView] AI Batch Complete, refreshing metadata...')
          refreshMetadata(file.id)
       }
    })
    return () => {
      if (removeListener) removeListener()
    }
  }, [file.tableName, file.id, refreshMetadata])

  const handleOpenSemanticEdit = (col: ColumnSchema) => {
    setEditingColumn(col)
  }

  const handleOpenExtractor = (col: ColumnSchema, hint?: { prompt: string; targetColumnName: string }) => {
    setAiExtractColumn(col)
    setActiveHint(hint || null)
  }

  const handleSaveSemantic = (data: {
    aliases: string[]
    description: string
    businessType: string
    usageType?: any
    defaultAggregation?: any
  }) => {
    if (!editingColumn) return
    updateColumnSemantic(file.id, editingColumn.name, data)
    setEditingColumn(null)
    toast.addToast({
      title: t('semantic_updated', 'Metadata Updated'),
      type: 'success',
    })
  }

  const handleRunExtract = async (prompt: string, newColumnName: string, sourceColumn: string) => {
    if (!file) return
    
    try {
      const res = await window.electronAPI.aiBatchExtract({
        tableName: file.tableName,
        columnName: sourceColumn,
        targetColumnName: newColumnName,
        prompt
      })
      
      if (res.success) {
         toast.addToast({
            title: t('ai_job_started', 'Extraction Started'),
            description: t('ai_job_desc', 'AI is processing your data in the background.'),
            type: 'success',
          })
      } else {
         toast.addToast({
            title: t('ai_job_failed', 'Failed to start job'),
            description: res.error,
            type: 'error',
          })
      }
    } catch (e: any) {
        toast.addToast({
            title: 'Error',
            description: e.message,
            type: 'error',
          })
    }
  }

  return (
    <>
      <div className="flex flex-col h-full bg-transparent relative">
        {/* Global Action Bar */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1">
                  {t('ai_extract_title', 'Smart Extraction')}
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {t('ai_extract_desc', 'Transform text into structured data using AI')}
                </p>
              </div>
           </div>
           <Button 
             variant="outline" 
             size="sm"
             onClick={() => {
                // If no column selected, pick the first one or just open
                const col = aiExtractColumn || file.columns.find(c => c.name !== '_ws_row_id') || file.columns[0]
                setAiExtractColumn(col)
             }}
             className="rounded-xl border-purple-100 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white transition-all gap-2 h-9"
           >
             <Sparkles className="w-3.5 h-3.5" />
             <span className="text-xs font-bold">{t('apply_extraction', 'Run AI Extract')}</span>
           </Button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="flex flex-col border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-50 dark:divide-zinc-800 z-0 relative shadow-sm">
            {file.columns
              .filter(col => col.name !== '_ws_row_id')
              .map(col => {
                const isVisible = col.semantic?.isVisibleToAI !== false
                const isAI = col.sourceType === 'ai'
              return (
                <div
                  key={col.name}
                  className={cn(
                    'group flex items-center gap-4 px-4 py-3 bg-white hover:bg-zinc-50/50 transition-colors',
                    !isVisible && 'opacity-60 bg-zinc-50/20',
                    isAI && 'bg-purple-50/20 hover:bg-purple-50/40 border-l-2 border-l-purple-400'
                  )}
                >
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <div
                      className={cn(
                        'p-1.5 rounded-lg border transition-all',
                        col.isPrimaryKey
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : isAI 
                            ? 'bg-purple-100 border-purple-200 text-purple-600'
                            : 'bg-white border-zinc-100 text-zinc-200'
                      )}
                    >
                      {isAI ? (
                        <Sparkles className="w-3 h-3 fill-current" />
                      ) : (
                        <Key
                          className={cn(
                            'w-3 h-3',
                            col.isPrimaryKey && 'fill-current'
                          )}
                        />
                      )}
                    </div>
                    <button
                      onClick={() =>
                        updateColumnSemantic(file.id, col.name, {
                          isVisibleToAI: !isVisible,
                        })
                      }
                      className={cn(
                        'p-1.5 rounded-lg transition-all border',
                        isVisible
                          ? 'text-zinc-300 border-transparent hover:border-zinc-200 hover:text-indigo-600'
                          : 'text-red-500 bg-red-50 border-red-100'
                      )}
                    >
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="w-48 shrink-0 flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className="text-sm font-bold text-zinc-900 truncate block leading-none"
                        title={col.name}
                      >
                        {col.name}
                      </span>
                      {isAI && (
                         <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-purple-50 text-purple-600 border-purple-100 font-black uppercase tracking-tighter">
                            AI Extracted
                         </Badge>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter leading-none">
                      {COLUMN_TYPE_CONFIG[col.type]?.label
                        ? t(COLUMN_TYPE_CONFIG[col.type]?.label)
                        : col.type}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-6 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap max-w-[200px] shrink-0">
                      {col.semantic?.businessType && (
                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-indigo-100/50">
                          {col.semantic.businessType}
                        </span>
                      )}
                      {(col.semantic?.aliases || [])
                        .slice(0, 2)
                        .map((alias, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-zinc-100 text-zinc-600 font-bold border-none text-[9px] px-1.5 py-0 rounded-md"
                          >
                            {alias}
                          </Badge>
                        ))}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-4 overflow-hidden opacity-50 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-px h-3 bg-zinc-100 shrink-0" />
                      <div className="flex items-center gap-1.5 truncate">
                        {(col.sampleValues || [])
                          .slice(0, 3)
                          .map((val, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium text-zinc-500 bg-zinc-100/50 px-2 py-0.5 rounded-md whitespace-nowrap tabular-nums"
                            >
                              {typeof val === 'object'
                                ? '{...}'
                                : String(val)}
                            </span>
                          ))}
                        {(col.sampleValues || []).length === 0 && (
                          <span className="text-[10px] italic text-zinc-300">
                            {t('no_samples')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                    {/* [V1.7.5] AI Re-extract Button */}
                    {isAI && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenExtractor(col, { prompt: '', targetColumnName: col.name })}
                        title={t('re_extract', 'Re-extract / Refine')}
                        className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-xl"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* [V1.7] AI Extract Button */}
                    {col.semantic?.extractionHints && col.semantic.extractionHints.length > 0 ? (
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenExtractor(col, col.semantic?.extractionHints?.[0])}
                        title={col.semantic.extractionHints[0].reason}
                        className="h-8 w-8 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl animate-pulse"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenExtractor(col)}
                        title={t('ai_extract_tooltip', 'AI Extract')}
                        className="h-8 w-8 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenSemanticEdit(col)}
                      className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <SemanticEditorModal
        isOpen={!!editingColumn}
        onClose={() => setEditingColumn(null)}
        onSave={handleSaveSemantic}
        column={editingColumn}
      />

      <AIExtractorDialog
        isOpen={!!aiExtractColumn}
        onClose={() => {
            setAiExtractColumn(null)
            setActiveHint(null)
        }}
        onRun={handleRunExtract}
        column={aiExtractColumn}
        columns={file.columns}
        tableName={file.tableName}
        initialPrompt={activeHint?.prompt}
        initialColumnName={activeHint?.targetColumnName}
      />
    </>
  )
}
