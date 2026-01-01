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
import { useAutoLink } from '@/hooks/useAutoLink.ts'
import { useMemo } from 'react'
import { useToastStore } from '../../stores/useToastStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { Analytics } from '../../services/analytics'

const TRIAL_ROW_LIMIT = 50000

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
  const { isActivated } = useSettingsStore()
  const { checkAutoLink } = useAutoLink()
  const { t } = useTranslation('common')
  const toast = useToastStore()

  const handleCancel = async () => {
    // Collect temp files from all tasks
    const tempFiles = tasks.map(t => t.tempFilePath).filter(Boolean) as string[]

    if (tempTableNames.length > 0 || tempFiles.length > 0) {
      try {
        await window.electronAPI.cleanupIngestion(tempTableNames, tempFiles)
      } catch (e) {
        console.error('Failed to cleanup staging tables/files', e)
      }
    }
    Analytics.track('ingest_wizard_cancelled', { step, mode })
    close()
  }

  const handleFinish = async () => {
    setProcessing(true)
    const limitRows = isActivated ? undefined : TRIAL_ROW_LIMIT

    try {
      const addedFileIds: string[] = []
      const finalizedTempTables = new Set<string>()

      for (const task of tasks) {
        if ((mode === 'append' || mode === 'merge') && targetTableId) {
          const targetFile = files.find(f => f.id === targetTableId)
          if (!targetFile) continue

          const pkNames =
            mode === 'merge'
              ? task.mergeKeys || []
              : task.columns.filter(c => c.isPrimaryKey).map(c => c.name)

          const result = await window.electronAPI.appendData({
            filePath: task.filePath,
            targetTableName: targetFile.tableName,
            sheetName:
              task.sourceName === task.fileName ? undefined : task.sourceName,
            uniqueKeys: pkNames,
            strategy:
              mode === 'merge' ? 'update' : task.conflictStrategy || 'ignore',
            columnMapping: task.columnMapping || {},
            tempFilePath: task.tempFilePath, // Pass cached CSV path
            limitRows,
          })

          if (result.success && result.data) {
            updateFile(targetFile.id, { rowCount: result.data.rowCount })
          } else {
            throw new Error(result.error || 'Operation failed')
          }
          finalizedTempTables.add(task.tableName)
        } else if (mode === 'replace' && targetTableId) {
          // --- REPLACE MODE ---
          const targetFile = files.find(f => f.id === targetTableId)
          if (!targetFile)
            throw new Error('Target file not found for replacement')

          // Reuse table name to overwrite
          const finalTableName = targetFile.tableName

          const result = await window.electronAPI.createTableFromSource({
            filePath: task.filePath,
            tableName: finalTableName,
            sheetName:
              task.sourceName === task.fileName ? undefined : task.sourceName,
            columns: task.columns.map(c => ({ name: c.name, type: c.type })),
            tempFilePath: task.tempFilePath,
            limitRows,
          })

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to replace table')
          }

          finalizedTempTables.add(task.tableName)

          const columns = result.data.columns.map(c => {
            // Try to preserve key status if column name matches
            const oldCol = targetFile.columns.find(old => old.name === c.name)
            return {
              name: c.name,
              safeName: c.name,
              type: c.type,
              sampleValues: c.sampleValues || [],
              isKey: oldCol ? oldCol.isKey : false,
              isPrimaryKey: oldCol ? oldCol.isPrimaryKey : false,
            }
          })

          const displayName =
            task.sourceName && task.sourceName !== task.fileName
              ? `${task.fileName.replace(/\.xlsx?$/, '')} - ${task.sourceName}`
              : task.sourceName || task.fileName.replace(/\.xlsx?$/, '')

          // Use reloadFile to safely update schema and validate relations
          useProjectStore.getState().reloadFile(targetFile.id, {
            lastModified: Date.now(),
            newColumns: columns as any,
          })

          // Update other metadata that reloadFile doesn't handle
          updateFile(targetFile.id, {
            path: task.filePath,
            name: task.finalDisplayName || displayName,
            sheetName:
              task.sourceName === task.fileName ? undefined : task.sourceName,
            rowCount: result.data.rowCount,
          })

          addedFileIds.push(targetFile.id)
        } else {
          // --- IMPORT MODE ---
          const finalTableName =
            task.finalTableName || task.tableName.replace('temp_ingest_', 't_')

          const result = await window.electronAPI.createTableFromSource({
            filePath: task.filePath,
            tableName: finalTableName,
            sheetName:
              task.sourceName === task.fileName ? undefined : task.sourceName,
            columns: task.columns.map(c => ({ name: c.name, type: c.type })),
            tempFilePath: task.tempFilePath, // Pass cached CSV path
            limitRows,
          })

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to create table')
          }

          finalizedTempTables.add(task.tableName)

          // Map backend schema (with fresh samples) to frontend file model
          const columns = result.data.columns.map(c => {
            const userConfig = task.columns.find(uc => uc.name === c.name)
            return {
              name: c.name,
              safeName: c.name,
              type: c.type,
              sampleValues: c.sampleValues || [], // Use fresh samples from DB
              isKey: userConfig?.isPrimaryKey || false,
              isPrimaryKey: userConfig?.isPrimaryKey || false,
            }
          })

          // Construct a friendly display name
          // If sourceName (Sheet1) != fileName (data.xlsx), show "data.xlsx - Sheet1"
          const displayName =
            task.sourceName && task.sourceName !== task.fileName
              ? `${task.fileName.replace(/\.xlsx?$/, '')} - ${task.sourceName}`
              : task.sourceName || task.fileName.replace(/\.xlsx?$/, '')

          const fileId = addFile({
            name: task.finalDisplayName || displayName,
            path: task.filePath,
            tableName: finalTableName,
            sheetName:
              task.sourceName === task.fileName ? undefined : task.sourceName,
            status: 'ready',
            columns: columns as any,
            rowCount: result.data.rowCount,
          })
          addedFileIds.push(fileId)
        }
      }

      const tablesToClean = tempTableNames.filter(
        name => !finalizedTempTables.has(name)
      )

      // Also clean up temp files for tasks that were NOT finalized
      // (Though createTableFromSource cleans up on success, if we skipped any task here, we should clean its file)
      const filesToClean = tasks
        .filter(t => !finalizedTempTables.has(t.tableName))
        .map(t => t.tempFilePath)
        .filter(Boolean) as string[]

      if (tablesToClean.length > 0 || filesToClean.length > 0) {
        await window.electronAPI.cleanupIngestion(tablesToClean, filesToClean)
      }

      if (addedFileIds.length > 0) {
        checkAutoLink(useProjectStore.getState().files)
      }

      setView('schema')

      Analytics.track('ingest_wizard_completed', {
        mode,
        file_count: tasks.length,
      })

      toast.addToast({
        title:
          mode === 'append'
            ? t('wizard.append_success')
            : mode === 'merge'
              ? t('wizard.merge_success', 'Data corrected successfully')
              : t('wizard.import_success'),
        type: 'success',
        duration: 3000,
      })

      close()
    } catch (e) {
      console.error('Final ingestion failed', e)
      toast.addToast({
        title: `${t('wizard.ingestion_failed')}: ${e instanceof Error ? e.message : 'Unknown error'}`,
        type: 'error',
        duration: 5000,
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleNext = () => {
    // Multi-task navigation within a step
    if (step === 'preview') {
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
    if (step === 'preview') {
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
    if (step === 'select') return tasks.length === 0
    if (step === 'target' && mode === 'import') {
      const currentTask = tasks[currentTaskIndex]
      return (
        !currentTask?.finalTableName ||
        files.some(f => f.tableName === currentTask.finalTableName)
      )
    }
    return false
  }, [step, tasks, currentTaskIndex, mode, files])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleCancel()}>
      <DialogContent
        className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div className="pl-8 pr-12 py-6 border-b border-zinc-100 bg-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold tracking-tight uppercase text-zinc-900">
            {t('wizard.title')}
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
                {t('wizard.processing')}
              </span>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-between shrink-0">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-zinc-500"
          >
            {t('cancel')}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'select' && currentTaskIndex === 0}
              className="border-zinc-200"
            >
              {t('wizard.back')}
            </Button>
            <Button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="bg-black hover:bg-zinc-800 text-white px-8 font-bold"
            >
              {step === 'summary'
                ? mode === 'append'
                  ? t('wizard.append_now')
                  : mode === 'replace'
                    ? t('wizard.replace_now', 'Replace Now')
                    : mode === 'merge'
                      ? t('wizard.merge_now', 'Correct Now')
                      : t('wizard.import_now')
                : tasks.length > 1 &&
                    (step === 'preview' || step === 'target') &&
                    currentTaskIndex < tasks.length - 1 &&
                    mode !== 'replace'
                  ? t('wizard.next_task')
                  : t('wizard.next')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
