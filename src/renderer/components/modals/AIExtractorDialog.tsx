import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Sparkles, ArrowRight, Loader2, Play } from 'lucide-react'
import { ColumnSchema } from '@shared/types'

interface AIExtractorDialogProps {
  isOpen: boolean
  onClose: () => void
  onRun: (prompt: string, newColumnName: string) => void
  column: ColumnSchema | null
  tableName: string
}

export function AIExtractorDialog({
  isOpen,
  onClose,
  onRun,
  column,
  tableName
}: AIExtractorDialogProps) {
  const { t } = useTranslation('common')

  const PRESET_PROMPTS = [
    { label: t('ai_extract_presets.sentiment'), prompt: t('ai_extract_presets.sentiment_prompt') },
    { label: t('ai_extract_presets.keywords'), prompt: t('ai_extract_presets.keywords_prompt') },
    { label: t('ai_extract_presets.categorize'), prompt: t('ai_extract_presets.categorize_prompt') },
    { label: t('ai_extract_presets.translate'), prompt: t('ai_extract_presets.translate_prompt') },
    { label: t('ai_extract_presets.clean_date'), prompt: t('ai_extract_presets.clean_date_prompt') },
  ]
  
  const [prompt, setPrompt] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<unknown[]>([])
  const [previewResult, setPreviewResult] = useState<string[]>([])
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null)

  // Load sample data when dialog opens
  useEffect(() => {
    if (isOpen && column && column.sampleValues) {
      setPreviewData(column.sampleValues.slice(0, 5))
      setNewColumnName(`${column.name}_ai`)
      setPrompt('')
      setPreviewResult([])
      setEstimatedCost(null)
    }
  }, [isOpen, column])

  const handlePreview = async () => {
    if (!prompt.trim() || !column) return
    setIsPreviewing(true)
    try {
      const res = await window.electronAPI.aiPreviewExtract(
        tableName, 
        column.name, 
        previewData, 
        prompt
      )
      
      if (res.success && res.data) {
        setPreviewResult(res.data.results)
        setEstimatedCost(res.data.estimatedCost)
      } else {
        console.error(res.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleRun = () => {
    if (!prompt.trim() || !newColumnName.trim()) return
    onRun(prompt, newColumnName)
    onClose()
  }

  const applyPreset = (p: string) => {
    setPrompt(p)
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden text-zinc-900 flex flex-col h-[600px]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            {t('ai_extract_title', 'AI Smart Extraction')}
            {column && (
               <Badge variant="outline" className="ml-2 font-mono text-zinc-500">
                 {column.name}
               </Badge>
            )}
          </DialogTitle>
          <p className="text-xs text-zinc-500 leading-relaxed mt-2 pl-11">
            {t('ai_extract_desc', 'Transform your data using AI. Extract information, analyze sentiment, or clean formats.')}
          </p>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: Configuration */}
          <div className="w-1/2 p-8 border-r border-zinc-100 flex flex-col gap-6 overflow-y-auto">
            
            {/* Target Column Name */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                {t('target_column_name', 'New Column Name')}
              </Label>
              <Input 
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                className="rounded-xl border-zinc-200 focus:ring-purple-500"
              />
            </div>

            {/* Prompt Input */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center">
                 <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {t('prompt', 'Prompt / Instruction')}
                </Label>
              </div>
              
              <Textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={t('prompt_placeholder', 'e.g. Extract the email address from this text...')}
                className="flex-1 rounded-xl border-zinc-200 resize-none p-4 font-medium focus:ring-purple-500"
              />
              
              {/* Presets */}
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_PROMPTS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(preset.prompt)}
                    className="text-[10px] px-2 py-1 bg-zinc-50 hover:bg-purple-50 text-zinc-600 hover:text-purple-600 rounded-md border border-zinc-200 hover:border-purple-200 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handlePreview} 
              disabled={isPreviewing || !prompt}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-10 font-bold"
            >
              {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Play className="w-4 h-4 mr-2"/>}
              {t('generate_preview')}
            </Button>

          </div>

          {/* Right: Preview */}
          <div className="w-1/2 bg-zinc-50/30 flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-white/50">
               <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('preview_results')}</span>
               {typeof estimatedCost === 'number' && (
                 <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-bold">
                   {t('estimated_cost')}: ${estimatedCost.toFixed(4)}
                 </Badge>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {previewData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">
                  {t('no_sample_data')}
                </div>
              ) : (
                previewData.map((val, idx) => (
                  <div key={idx} className="bg-white border border-zinc-100 rounded-xl p-3 shadow-sm flex items-stretch gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1">{t('input')}</div>
                      <div className="text-sm text-zinc-700 break-words">{String(val)}</div>
                    </div>
                    <div className="w-6 flex items-center justify-center text-zinc-300">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 bg-purple-50/30 rounded-lg p-2 border border-purple-100/50">
                      <div className="text-[10px] text-purple-400 uppercase font-bold mb-1">{t('output_ai')}</div>
                      {previewResult[idx] ? (
                        <div className="text-sm text-purple-900 font-medium break-words">{previewResult[idx]}</div>
                      ) : (
                        <div className="h-5 w-24 bg-zinc-100 rounded animate-pulse" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-5 border-t border-zinc-100 bg-white">
          <div className="flex-1 text-xs text-zinc-400 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            <span>{t('ai_extract_warning')}</span>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleRun}
            disabled={!newColumnName || !prompt}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-purple-200"
          >
            {t('apply_extraction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
