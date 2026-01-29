import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileNode, ColumnSchema } from '@shared/types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Edit2, Eye, EyeOff, Key, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { COLUMN_TYPE_CONFIG } from '@/src/lib/constants'
import { useProjectStore } from '@/stores/useProjectStore'
import { useToastStore } from '@/stores/useToastStore'
import { SemanticEditorModal } from '../modals/SemanticEditorModal'
import { AIExtractorDialog } from '../modals/AIExtractorDialog'

interface ColumnsViewProps {
  file: FileNode
}

export function ColumnsView({ file }: ColumnsViewProps) {
  const { t } = useTranslation('common')
  const toast = useToastStore()
  
  const updateColumnSemantic = useProjectStore(s => s.updateColumnSemantic)
  
  const [editingColumn, setEditingColumn] = useState<ColumnSchema | null>(null)
  const [aiExtractColumn, setAiExtractColumn] = useState<ColumnSchema | null>(null)

  const handleOpenSemanticEdit = (col: ColumnSchema) => {
    setEditingColumn(col)
  }

  const handleSaveSemantic = (data: {
    aliases: string[]
    description: string
    businessType: string
  }) => {
    if (!editingColumn) return
    updateColumnSemantic(file.id, editingColumn.name, data)
    setEditingColumn(null)
    toast.addToast({
      title: t('semantic_updated', 'Metadata Updated'),
      type: 'success',
    })
  }

  const handleRunExtract = async (prompt: string, newColumnName: string) => {
    if (!aiExtractColumn || !file) return
    
    try {
      const res = await window.electronAPI.aiBatchExtract(
        file.tableName,
        aiExtractColumn.name,
        newColumnName,
        prompt
      )
      
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
      <div className="flex flex-col h-full bg-white relative">
        {/* Sticky Header */}
        {/*<div className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200 px-8 py-2.5 flex items-center gap-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest shrink-0 shadow-sm">*/}
        {/*  <div className="w-16 shrink-0">{t('list_status')}</div>*/}
        {/*  <div className="w-48 shrink-0">{t('list_field_type')}</div>*/}
        {/*  <div className="flex-1">{t('list_semantic_samples')}</div>*/}
        {/*  <div className="w-12 text-right">{t('list_edit')}</div>*/}
        {/*</div>*/}

        <div className="px-4 py-6 overflow-y-auto flex-1">
          <div className="flex flex-col border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50 z-0 relative">
            {file.columns
              .filter(col => col.name !== '_ws_row_id')
              .map(col => {
                const isVisible = col.semantic?.isVisibleToAI !== false
              return (
                <div
                  key={col.name}
                  className={cn(
                    'group flex items-center gap-4 px-4 py-3 bg-white hover:bg-zinc-50/50 transition-colors',
                    !isVisible && 'opacity-60 bg-zinc-50/20'
                  )}
                >
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <div
                      className={cn(
                        'p-1.5 rounded-lg border transition-all',
                        col.isPrimaryKey
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-zinc-100 text-zinc-200'
                      )}
                    >
                      <Key
                        className={cn(
                          'w-3 h-3',
                          col.isPrimaryKey && 'fill-current'
                        )}
                      />
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
                    <span
                      className="text-sm font-bold text-zinc-900 truncate block leading-none mb-1.5"
                      title={col.name}
                    >
                      {col.name}
                    </span>
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
                    {/* [V1.7] AI Extract Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAiExtractColumn(col)}
                      title={t('ai_extract_tooltip', 'AI Extract')}
                      className="h-8 w-8 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </Button>

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
        onClose={() => setAiExtractColumn(null)}
        onRun={handleRunExtract}
        column={aiExtractColumn}
        tableName={file.tableName}
      />
    </>
  )
}
