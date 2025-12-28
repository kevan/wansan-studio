import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useWizardStore } from '../../stores/useWizardStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { Steps } from './Steps'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { FileSelectionStep } from './steps/FileSelectionStep'
import { DataPreviewStep } from './steps/DataPreviewStep'
import { TargetSelectionStep } from './steps/TargetSelectionStep'
import { SummaryStep } from './steps/SummaryStep'
import { Loader2 } from 'lucide-react'
import { useAutoLink } from '../../hooks/useAutoLink'
import { useMemo } from 'react'

export function DataIngestionWizard() {
  const {
    isOpen,
    close,
    step,
    setStep,
    tasks,
    currentTaskIndex,
    nextTask,
    prevTask,
    isProcessing,
    setProcessing,
    mode,
    targetTableId,
    tempTableNames,
  } = useWizardStore()
  const { files, addFile, updateFile, setView } = useProjectStore()
  const { checkAutoLink } = useAutoLink()
  const { t } = useTranslation('common')

  const handleCancel = async () => {
    if (tempTableNames.length > 0) {
      try {
        await window.electronAPI.cleanupIngestion(tempTableNames)
      } catch (e) {
        console.error('Failed to cleanup staging tables', e)
      }
    }
    close()
  }

  const handleFinish = async () => {
    setProcessing(true)
    try {
      const addedFileIds: string[] = []
      const finalizedTempTables = new Set<string>()

      for (const task of tasks) {
        if (mode === 'append' && targetTableId) {
          const targetFile = files.find(f => f.id === targetTableId)
          if (!targetFile) continue

          const pkNames = task.columns
            .filter(c => c.isPrimaryKey)
            .map(c => c.name)

          const result = await window.electronAPI.appendData({
            filePath: task.filePath,
            targetTableName: targetFile.tableName,
            sheetName:
              task.sourceName === task.fileName ? undefined : task.sourceName,
            uniqueKeys: pkNames,
            strategy: task.conflictStrategy || 'ignore',
            columnMapping: task.columnMapping || {}
          })

          if (result.success && result.data) {
            updateFile(targetFile.id, { rowCount: result.data.rowCount })
          } else {
            throw new Error(result.error || 'Append failed')
          }
          finalizedTempTables.add(task.tableName)
        } else {
          // --- IMPORT MODE ---
          const finalTableName = task.finalTableName || task.tableName.replace('temp_ingest_', 't_');

          await window.electronAPI.finalizeIngestion(task.tableName, finalTableName)
          finalizedTempTables.add(task.tableName)

          const columns = task.columns.map(c => ({
            name: c.name, safeName: c.name, type: c.type,
            sampleValues: [], isKey: c.isPrimaryKey, isPrimaryKey: c.isPrimaryKey,
          }))

          const fileId = addFile({
            name: task.sourceName,
            path: task.filePath,
            tableName: finalTableName,
            sheetName:
              task.sourceName === task.fileName ? undefined : task.sourceName,
            status: 'ready',
            columns: columns as any,
            rowCount: task.rowCount,
          })
          addedFileIds.push(fileId)
        }
      }

      const tablesToClean = tempTableNames.filter(name => !finalizedTempTables.has(name))
      if (tablesToClean.length > 0) {
        await window.electronAPI.cleanupIngestion(tablesToClean)
      }

      if (addedFileIds.length > 0) {
        checkAutoLink(useProjectStore.getState().files)
      }
      
      setView('schema')
      close()
    } catch (e) {
      console.error('Final ingestion failed', e)
    } finally {
      setProcessing(false)
    }
  }

  const handleNext = () => {
    // Multi-task navigation within a step
    if (step === 'preview' || step === 'target') {
      const isLastTask = currentTaskIndex === tasks.length - 1
      if (!isLastTask) {
        nextTask()
        return
      }
    }
    
    // Step transitions
    if (step === 'select') {
      if (tasks.length > 0) setStep('preview')
    } else if (step === 'preview') {
      setStep('target')
    } else if (step === 'target') {
      setStep('summary')
    } else if (step === 'summary') {
      handleFinish()
    }
  }

  const handleBack = () => {
    // Multi-task navigation within a step
    if (step === 'preview' || step === 'target') {
      if (currentTaskIndex > 0) {
        prevTask()
        return
      }
    }
    
    // Step transitions
    if (step === 'preview') setStep('select')
    else if (step === 'target') setStep('preview')
    else if (step === 'summary') setStep('target')
  }
  
  const isNextDisabled = useMemo(() => {
    if (step === 'select') return tasks.length === 0;
    
    // Validation for Target step in Import mode
    if (step === 'target' && mode === 'import') {
      const currentTask = tasks[currentTaskIndex];
      return !currentTask?.finalTableName || files.some(f => f.tableName === currentTask.finalTableName);
    }
    return false;
  }, [step, tasks, currentTaskIndex, mode, files]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleCancel()}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none">
        <div className="px-8 py-5 border-b border-zinc-100 bg-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold tracking-tight uppercase">
            Data Ingestion
          </h2>
          <Steps currentStep={step} />
        </div>

        <div className="flex-1 overflow-hidden bg-zinc-50/50 relative">
          {step === 'select' && <FileSelectionStep />}
          {step === 'preview' && <DataPreviewStep />}
          {step === 'target' && <TargetSelectionStep />}
          {step === 'summary' && <SummaryStep />}

          {isProcessing && (
            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <span className="text-sm font-bold text-zinc-900 uppercase tracking-widest">
                Finalizing Import...
              </span>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-between shrink-0">
          <Button variant="ghost" onClick={handleCancel} className="text-zinc-500">
            {t('cancel')}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'select' && currentTaskIndex === 0}
              className="border-zinc-200"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="bg-black hover:bg-zinc-800 text-white px-8 font-bold"
            >
              {step === 'summary' ? 'Finish' : tasks.length > 1 && (step === 'preview' || step === 'target') && currentTaskIndex < tasks.length - 1 ? 'Next Task' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}