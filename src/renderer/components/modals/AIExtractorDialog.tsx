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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Sparkles, ArrowRight, Loader2, Play, MoreHorizontal, Save, Trash2 } from 'lucide-react'
import { ColumnSchema } from '@shared/types'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { SYSTEM_PRESETS_EN, SYSTEM_PRESETS_ZH } from '@/lib/ai-presets'

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
  const { extractTemplates, addExtractTemplate, removeExtractTemplate, importExtractTemplates } = useSettingsStore()
  
  const [prompt, setPrompt] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<unknown[]>([])
  const [previewResult, setPreviewResult] = useState<string[]>([])
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null)
  
  // Save template state
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Load sample data when dialog opens
  useEffect(() => {
    if (isOpen && column && column.sampleValues) {
      setPreviewData(column.sampleValues.slice(0, 5))
      setNewColumnName(`${column.name}_ai`)
      setPrompt('')
      setPreviewResult([])
      setEstimatedCost(null)
      setIsSavingTemplate(false)
      setNewTemplateName('')
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

  const handleSaveTemplate = () => {
    if (!prompt.trim() || !newTemplateName.trim()) return
    addExtractTemplate({ label: newTemplateName, prompt })
    setIsSavingTemplate(false)
    setNewTemplateName('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white text-zinc-900 flex flex-col h-[700px]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 bg-white flex justify-between items-start shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-zinc-900 tracking-tight">
              <div className="p-2.5 bg-zinc-900 text-white rounded-xl shadow-lg shadow-zinc-200">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              {t('ai_extract_title', 'AI Smart Extraction')}
            </DialogTitle>
            <p className="text-sm text-zinc-500 mt-2 pl-[3.25rem] font-medium leading-relaxed max-w-lg">
              {t('ai_extract_desc', 'Transform your data using AI. Extract information, analyze sentiment, or clean formats.')}
            </p>
          </div>
          {column && (
             <Badge variant="outline" className="px-3 py-1.5 rounded-lg text-sm border-zinc-200 bg-zinc-50 text-zinc-600 font-mono tracking-tight">
               Column: <span className="font-bold text-zinc-900 ml-1">{column.name}</span>
             </Badge>
          )}
        </div>

        <div className="flex flex-1 min-h-0 bg-zinc-50/50">
          {/* Left: Configuration - Input Zone */}
          <div className="w-7/12 p-8 flex flex-col gap-6 overflow-y-auto bg-white border-r border-zinc-100 shadow-[20px_0_40px_-10px_rgba(0,0,0,0.02)] z-10">
            
            {/* Target Column Name */}
            <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 pl-1">
                {t('target_column_name', 'New Column Name')}
              </Label>
              <Input 
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                className="h-11 rounded-xl border-zinc-200 bg-white focus:ring-2 focus:ring-purple-500/20 font-medium text-base shadow-sm transition-all hover:border-purple-200"
                placeholder="e.g. sentiment_score"
              />
            </div>

            {/* Prompt Input */}
            <div className="flex-1 flex flex-col min-h-0 gap-3">
              <div className="flex justify-between items-center px-1">
                 <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {t('prompt', 'Prompt / Instruction')}
                </Label>
                
                {/* Save as Template Control */}
                {isSavingTemplate ? (
                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                    <Input 
                      className="h-7 w-40 text-xs rounded-lg border-zinc-200 focus:ring-purple-500/20" 
                      placeholder={t('template_name_placeholder')}
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-green-50 hover:text-green-600" onClick={handleSaveTemplate}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-600" onClick={() => setIsSavingTemplate(false)}>
                      <span className="text-xs font-bold">✕</span>
                    </Button>
                  </div>
                ) : (
                  <button 
                    className="text-[10px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1.5"
                    onClick={() => {
                      if (prompt.trim()) setIsSavingTemplate(true)
                    }}
                    disabled={!prompt.trim()}
                  >
                    <Save className="w-3 h-3" />
                    {t('save_template')}
                  </button>
                )}
              </div>
              
              <div className="flex-1 relative group">
                <Textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={t('prompt_placeholder', 'e.g. Extract the email address from this text...')}
                  className="w-full h-full min-h-[12rem] rounded-2xl border-zinc-200 resize-none p-5 font-medium text-base focus:ring-2 focus:ring-purple-500/20 leading-relaxed shadow-sm transition-all group-hover:border-zinc-300"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                   {/* Optional: Add insert variables or helpers here later */}
                </div>
              </div>
              
              {/* Templates */}
              <div className="min-h-[3rem] p-1">
                <div className="flex flex-wrap gap-2 items-center">
                  {extractTemplates.length === 0 ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => importExtractTemplates(SYSTEM_PRESETS_ZH)}
                        className="text-[10px] font-medium px-3 py-1.5 bg-white text-zinc-500 hover:text-purple-600 hover:border-purple-200 rounded-lg border border-dashed border-zinc-200 transition-all flex items-center gap-1.5 hover:shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        {t('import_presets_zh')}
                      </button>
                      <button 
                        onClick={() => importExtractTemplates(SYSTEM_PRESETS_EN)}
                        className="text-[10px] font-medium px-3 py-1.5 bg-white text-zinc-500 hover:text-purple-600 hover:border-purple-200 rounded-lg border border-dashed border-zinc-200 transition-all flex items-center gap-1.5 hover:shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        {t('import_presets_en')}
                      </button>
                    </div>
                  ) : (
                    <>
                      {extractTemplates.map((tpl) => (
                        <div key={tpl.id} className="group/tag relative">
                          <button
                            onClick={() => applyPreset(tpl.prompt)}
                            className="text-[11px] font-medium px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 rounded-lg border border-zinc-200 transition-all hover:shadow-sm pr-7 truncate max-w-[12rem]"
                          >
                            {tpl.label}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              removeExtractTemplate(tpl.id)
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-red-500 opacity-0 group-hover/tag:opacity-100 transition-all p-0.5 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-[10px] px-2 py-1.5 bg-white hover:bg-zinc-50 text-zinc-400 hover:text-zinc-600 rounded-lg border border-dashed border-zinc-200 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={() => importExtractTemplates(SYSTEM_PRESETS_ZH)}>
                            {t('import_presets_zh')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importExtractTemplates(SYSTEM_PRESETS_EN)}>
                            {t('import_presets_en')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => extractTemplates.forEach(t => removeExtractTemplate(t.id))}>
                            {t('clear_templates')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePreview} 
              disabled={isPreviewing || !prompt}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-12 font-bold text-sm tracking-wide shadow-xl shadow-zinc-200 hover:shadow-2xl hover:shadow-zinc-300 transition-all"
            >
              {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Play className="w-4 h-4 mr-2 fill-current"/>}
              {t('generate_preview')}
            </Button>

          </div>

          {/* Right: Preview - Output Zone */}
          <div className="w-5/12 bg-zinc-50/50 flex flex-col relative">
            {/* Dot Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-white/80 backdrop-blur-sm z-10 sticky top-0">
               <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                 {t('preview_results')}
               </span>
               {typeof estimatedCost === 'number' && (
                 <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100 font-bold tabular-nums">
                   ${estimatedCost.toFixed(4)}
                 </Badge>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 z-0">
              {previewData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-zinc-300" />
                  </div>
                  <p className="text-sm font-medium">{t('no_sample_data')}</p>
                </div>
              ) : (
                previewData.map((val, idx) => (
                  <div key={idx} className="group bg-white border border-zinc-100 rounded-2xl p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:shadow-purple-500/5 hover:border-purple-100 transition-all duration-300 flex flex-col gap-3">
                    {/* Input Row */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">{t('input')}</div>
                        <div className="text-sm text-zinc-600 leading-relaxed break-words font-medium">{String(val)}</div>
                      </div>
                    </div>
                    
                    {/* Connection Line */}
                    <div className="pl-[0.4rem] h-4 border-l-2 border-dashed border-zinc-100" />

                    {/* Output Row */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                      <div className="flex-1 min-w-0 bg-purple-50/50 rounded-xl p-3 border border-purple-100/50">
                        <div className="text-[9px] text-purple-400 uppercase font-bold tracking-wider mb-1 flex justify-between">
                          {t('output_ai')}
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
                        </div>
                        {previewResult[idx] ? (
                          <div className="text-sm text-purple-900 font-semibold leading-relaxed break-words">{previewResult[idx]}</div>
                        ) : (
                          <div className="flex gap-1 items-center h-5">
                             <div className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-bounce [animation-delay:-0.3s]" />
                             <div className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-bounce [animation-delay:-0.15s]" />
                             <div className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-bounce" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-5 border-t border-zinc-100 bg-white shrink-0">
          <div className="flex-1 text-xs text-zinc-400 flex items-center gap-2 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{t('ai_extract_warning')}</span>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleRun}
            disabled={!newColumnName || !prompt}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all hover:-translate-y-0.5"
          >
            {t('apply_extraction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}