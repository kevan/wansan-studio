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
  RefreshCw,
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

  const syncTask = async (task: IngestionTask) => {
    // 1. Mark as syncing immediately
    const currentTasks = useWizardStore.getState().tasks
    const taskIndex = currentTasks.findIndex(t => t.id === task.id)
    if (taskIndex === -1) return
    
    useWizardStore.getState().updateTask(taskIndex, { status: 'syncing', error: undefined })

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

      const { tempFilePath, rowCount, columns, preview, readOptions } = resultData
      
      // Final Check: Is task still there?
      const latestTasks = useWizardStore.getState().tasks
      const currentIndex = latestTasks.findIndex(t => t.id === task.id)
      if (currentIndex === -1) {
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
        readOptions: readOptions || task.readOptions
      })
    } catch (e: any) {
      console.error('[Wizard] Task preparation failed:', e)
      const latestTasks = useWizardStore.getState().tasks
      const currentIndex = latestTasks.findIndex(t => t.id === task.id)
      if (currentIndex !== -1) {
        useWizardStore.getState().updateTask(currentIndex, { 
          status: 'error', 
          error: e.message || 'Synchronization failed' 
        })
      }
    }
  }
  
  // Auto-Preloading Effect
  useEffect(() => {
    const pendingTasks = tasks.filter(t => t.status === 'waiting_for_sync')
    if (pendingTasks.length === 0) return

    pendingTasks.forEach(task => {
      syncTask(task)
    })
  }, [tasks])

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
    try {
      const newTasks: IngestionTask[] = []
      
      for (const file of files) {
        const res = await window.electronAPI.inspectFile(file.path)
        if (!res.success || !res.data) {
          throw new Error(res.error || `Failed to inspect ${file.name}`)
        }

        const fileTasks = res.data.map((item: any) => {
          // [Stage 1] No columns yet. They will be populated in Stage 2 (Prepare).
          const columns: ColumnConfig[] = []

          const displayName = item.sourceName && item.sourceName !== file.name
              ? `${file.name.replace(/\.xlsx?$/, '')} - ${item.sourceName}`
              : item.sourceName || file.name.replace(/\.xlsx?$/, '')

          return {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fileName: file.name,
            filePath: file.path,
            sourceName: item.sourceName,
            finalDisplayName: displayName,
            status: 'waiting_for_sync', // Triggers Stage 2
            columns,
            previewData: [],
            rowCount: 0,
            tableName: `temp_ingest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
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
      
      if (uniqueNewTasks.length > 0) {
        setTasks([...tasks, ...uniqueNewTasks])
      }

      if (skippedCount > 0) {
        useToastStore.getState().addToast({
          title: t('wizard.files_skipped', { count: skippedCount }),
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
    const task = tasks.find(t => t.id === id)
    if (task?.tempFilePath && task.tempFilePath !== task.filePath) {
      // Clean up temp file
      window.electronAPI.cleanupIngestion([], [task.tempFilePath])
    }
    setTasks(tasks.filter(t => t.id !== id))
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <DatabaseSelectorDialog />
      
      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8 border-4 border-white shadow-xl">
            <Upload className="w-10 h-10 text-indigo-600" />
          </div>
          
          <h3 className="text-2xl font-bold text-zinc-900 mb-3 tracking-tight">
            {t('wizard.select_title')}
          </h3>
          <p className="text-zinc-500 max-w-md mb-10 leading-relaxed">
            {t('wizard.select_desc')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={handleSelectFiles}
              disabled={isParsing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-10 h-14 font-bold text-lg shadow-lg shadow-indigo-100 hover:scale-105 transition-all active:scale-95"
            >
              {isParsing ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Plus className="w-6 h-6 mr-3" />}
              {t('wizard.select_files')}
            </Button>

            {isDBAvailable && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setDbSelectorOpen(true)}
                className="rounded-2xl px-10 h-14 font-bold text-lg border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
              >
                <Database className="w-6 h-6 mr-3 text-pink-500" />
                {t('wizard.connect_db')}
              </Button>
            )}
          </div>
          
          <div className="mt-12 flex items-center gap-8 opacity-40 grayscale group hover:grayscale-0 transition-all duration-500">
            <FileSpreadsheet className="w-8 h-8" />
            <FileText className="w-8 h-8" />
            <Layers className="w-8 h-8" />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-500">
          <div className="px-12 py-8 flex justify-between items-center bg-zinc-50/50 border-b border-zinc-100">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">{t('wizard.tasks_title', 'Data Sources')}</h3>
              <p className="text-xs text-zinc-500 mt-1">{t('wizard.tasks_desc', 'Confirm the files or tables you want to ingest.')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleSelectFiles}
                disabled={isParsing}
                className="rounded-xl border-zinc-200 font-bold h-10 px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('wizard.add_more')}
              </Button>
              {isDBAvailable && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setDbSelectorOpen(true)}
                  className="rounded-xl border-zinc-200 font-bold h-10 px-4"
                >
                  <Database className="w-4 h-4 mr-2 text-pink-500" />
                  {t('wizard.add_db')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 bg-white">
             <div className="max-w-4xl mx-auto space-y-4">
               {tasks.map((task) => (
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
                         <div className="flex items-center gap-1.5">
                           <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider truncate max-w-[150px]" title={task.error}>
                             Error
                           </span>
                           <button 
                             onClick={() => syncTask(task)}
                             className="p-1 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-indigo-600 transition-colors"
                             title="Retry"
                           >
                             <RefreshCw className="w-3 h-3" />
                           </button>
                         </div>
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
