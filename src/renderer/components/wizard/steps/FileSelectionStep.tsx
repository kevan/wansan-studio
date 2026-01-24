import React, { useEffect, useState } from 'react'
import { useWizardStore } from '@/stores/useWizardStore'
import { Button } from '../../ui/button'
import {
  AlertCircle,
  Check,
  Database,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { IngestionTask, ColumnConfig } from '@shared/types/wizard'
import { DatabaseSelectorDialog } from './DatabaseSelectorDialog'
import { useToastStore } from '@/stores/useToastStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function FileSelectionStep() {
  const { mode, setTasks, tasks, setDbSelectorOpen } = useWizardStore()
  const { t } = useTranslation('common')
  
  // Database connector is only available in 'import' mode for v1.6
  const isDBAvailable = mode === 'import'

  // --- Logic for File Parsing ---
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Auto-Preloading Effect
  useEffect(() => {
    const pendingTasks = tasks.filter(t => t.status === 'waiting_for_sync')
    
    if (pendingTasks.length === 0) return

    pendingTasks.forEach(async (task) => {
      // 1. Mark as syncing immediately
      const taskIndex = tasks.findIndex(t => t.id === task.id)
      if (taskIndex === -1) return
      
      // Update store directly to avoid dependency cycle in effect
      useWizardStore.getState().updateTask(taskIndex, { status: 'syncing' })

      try {
        const { dbConnections } = useSettingsStore.getState()
        let resultData: any

        if (task.connectionId) {
          const conn = dbConnections.find(c => c.id === task.connectionId)
          if (!conn) throw new Error('Connection not found')

          const hintTableName = `t_${task.sourceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          const res = await window.electronAPI.syncDBTable(conn, task.sourceName, hintTableName)
          
          if (!res.success || !res.data) throw new Error(res.error || `Failed to sync ${task.sourceName}`)
          resultData = res.data
        } else {
           const res = await window.electronAPI.prepareFile(task.filePath, task.sourceName, task.readOptions)
           if (!res.success || !res.data) throw new Error(res.error || `Failed to prepare ${task.sourceName}`)
           resultData = res.data
        }

        const { tempFilePath, rowCount, columns, preview } = resultData
        
        // Final Check: Is task still there?
        const currentTasks = useWizardStore.getState().tasks
        const currentIndex = currentTasks.findIndex(t => t.id === task.id)
        if (currentIndex === -1) {
           // Task was removed by user, cleanup temp file if needed
           if (tempFilePath && tempFilePath !== task.filePath) {
             window.electronAPI.cleanupIngestion([], [tempFilePath])
           }
           return
        }

        let finalTableName = task.finalTableName
        if (!finalTableName) {
           const uniqueNameRes = await window.electronAPI.getUniqueTableName(task.fileName, task.sourceName)
           finalTableName = uniqueNameRes.success ? uniqueNameRes.data : `t_${Date.now()}`
        }

        useWizardStore.getState().updateTask(currentIndex, {
          status: 'ready',
          filePath: tempFilePath,
          tempFilePath: tempFilePath,
          finalTableName: finalTableName || task.finalTableName,
          tableName: finalTableName || task.tableName, 
          columns: columns.map((c: any) => ({
            name: c.name,
            type: c.type as any,
            isPrimaryKey: false 
          })),
          previewData: preview || [],
          rowCount: rowCount,
        })

      } catch (e: any) {
        console.error('Auto-preload failed', e)
        const currentTasks = useWizardStore.getState().tasks
        const currentIndex = currentTasks.findIndex(t => t.id === task.id)
        if (currentIndex !== -1) {
           useWizardStore.getState().updateTask(currentIndex, { status: 'error', error: e.message })
        }
      }
    })
  }, [tasks]) // Dependency on tasks ensures this runs when new tasks are added

  const handleSelectFiles = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.selectFiles()

    if (result.success && result.data && result.data.length > 0) {
      parseFiles(result.data.map(f => ({ path: f.path, name: f.path.split(/[\\/]/).pop() || 'unknown', size: f.size })))
    }
  }

  const parseFiles = async (files: { path: string; name: string }[]) => {
    setIsParsing(true)
    setError(null)
    const newTasks: IngestionTask[] = []

    try {
      for (const file of files) {
        // [Stage 1] Lightweight Inspect
        const res = await window.electronAPI.inspectFile(file.path)
        if (!res.success || !res.data) throw new Error(res.error || 'Failed to inspect file')
        
        const fileTasks = res.data.map((item: any) => {
          // [Stage 1] No columns yet. They will be populated in Stage 2 (Prepare).
          const columns: ColumnConfig[] = []

          const displayName = item.sourceName && item.sourceName !== file.name
              ? `${file.name.replace(/\.xlsx?$/, '')} - ${item.sourceName}`
              : item.sourceName || file.name.replace(/\.xlsx?$/, '')

          return {
            id: crypto.randomUUID(),
            sourceName: item.sourceName || file.name,
            fileName: file.name,
            filePath: file.path,
            tableName: '', // Will be set in Stage 2
            finalTableName: '', // Will be set in Stage 2
            finalDisplayName: displayName,
            columns,
            previewData: [], // Empty for now
            rowCount: 0, // Unknown for now
            mode: mode,
            status: 'waiting_for_sync', // Unified status with DB
            readOptions: item.readOptions, // [NEW] Save detected encoding etc
          } as IngestionTask
        })

        newTasks.push(...fileTasks)
      }

      // De-duplication
      const uniqueNewTasks = newTasks.filter(newTask => 
        !tasks.some(existingTask => 
          existingTask.filePath === newTask.filePath && 
          existingTask.sourceName === newTask.sourceName
        )
      )

      const skippedCount = newTasks.length - uniqueNewTasks.length
      
      setTasks([...tasks, ...uniqueNewTasks])

      if (skippedCount > 0) {
        useToastStore.getState().addToast({
          title: t('wizard.duplicates_skipped', 'Duplicates Skipped'),
          description: t('wizard.duplicates_skipped_desc', { count: skippedCount }),
          type: 'info'
        })
      }
    } catch (err: any) {
      console.error('[Wizard] File inspection failed:', err)
      setError(err.message || 'Failed to parse files')
    } finally {
      setIsParsing(false)
    }
  }

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id))
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50/30 relative">
      <DatabaseSelectorDialog />

      {/* Empty State / Add Buttons */}
      {tasks.length === 0 && !isParsing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
            <Upload className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 mb-2">{t('import_data')}</h3>
          <p className="text-sm text-zinc-500 max-w-sm text-center mb-8">{t('import_data_desc')}</p>
          
          <div className="flex gap-4">
            <Button onClick={handleSelectFiles} className="h-auto py-3 px-6 flex flex-col items-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-indigo-300 text-zinc-900 shadow-sm transition-all group w-40">
              <FileSpreadsheet className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Excel / CSV</span>
            </Button>
            
            {isDBAvailable && (
              <Button onClick={() => setDbSelectorOpen(true)} className="h-auto py-3 px-6 flex flex-col items-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-indigo-300 text-zinc-900 shadow-sm transition-all group w-40">
                <Database className="w-6 h-6 text-pink-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Database</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header Actions */}
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-white shrink-0">
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t('selected_data')}</h3>
              <p className="text-2xl font-black text-black uppercase mt-1">
                {tasks.length} {tasks.length === 1 ? 'Source' : 'Sources'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectFiles} disabled={isParsing}>
                <Plus className="w-3.5 h-3.5 mr-2" /> File
              </Button>
              {isDBAvailable && (
                <Button variant="outline" size="sm" onClick={() => setDbSelectorOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> DB Table
                </Button>
              )}
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-6">
             {isParsing && (
               <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 animate-in fade-in">
                 <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                 <span className="text-sm font-bold text-indigo-700">Analyzing files...</span>
               </div>
             )}

             <div className="space-y-3">
               {tasks.map(task => (
                 <div key={task.id} className="group bg-white border border-zinc-200 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-300 transition-all shadow-sm">
                   <div className={cn(
                     "p-2.5 rounded-lg shrink-0",
                     task.connectionId ? "bg-pink-50 text-pink-600" : 
                     task.fileName.endsWith('.parquet') ? "bg-amber-50 text-amber-600" :
                     "bg-blue-50 text-blue-600"
                   )}>
                     {task.connectionId ? <Database className="w-5 h-5" /> : 
                      task.fileName.endsWith('.parquet') ? <Layers className="w-5 h-5" /> :
                      <FileText className="w-5 h-5" />}
                   </div>
                   
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-bold text-zinc-900 truncate">{task.sourceName}</span>
                       
                       {task.status === 'waiting_for_sync' && (
                         <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                           Pending
                         </span>
                       )}
                       {task.status === 'syncing' && (
                         <span className="flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                           <Loader2 className="w-2.5 h-2.5 animate-spin" /> Preparing
                         </span>
                       )}
                       {task.status === 'ready' && (
                         <span className="flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                           <Check className="w-2.5 h-2.5" /> Ready
                         </span>
                       )}
                       {task.status === 'error' && (
                         <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider truncate max-w-[150px]" title={task.error}>
                           Error
                         </span>
                       )}
                     </div>
                     <p className="text-xs text-zinc-400 mt-0.5 truncate">{task.fileName}</p>
                   </div>

                   {task.status === 'ready' && (
                     <div className="text-right shrink-0 animate-in fade-in slide-in-from-right-1">
                       <p className="text-[10px] font-mono font-black text-zinc-500 uppercase leading-tight">
                         {task.rowCount.toLocaleString()} Rows
                       </p>
                       <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter mt-0.5">
                         {task.columns.length} Columns
                       </p>
                     </div>
                   )}

                   <button 
                     onClick={() => handleRemoveTask(task.id)}
                     className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in slide-in-from-bottom-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}