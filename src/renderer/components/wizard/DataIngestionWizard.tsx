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

export function DataIngestionWizard() {
  const {
    isOpen,
    close,
    step,
    setStep,
    tasks,
    isProcessing,
    setProcessing,
    mode,
  } = useWizardStore()
  const { addFile, updateFile, setView } = useProjectStore()
  const { checkAutoLink } = useAutoLink()
  const { t } = useTranslation('common')

  const handleFinish = async () => {
    setProcessing(true)
    try {
      const addedFileIds: string[] = []

      for (const task of tasks) {
        // 1. Prepare Column Schemas with user-defined types and PK
        const columns = task.columns.map(c => ({
          name: c.name,
          safeName: c.name,
          type: c.type,
          sampleValues: [], // Will be updated on load
          isKey: c.isPrimaryKey, // isKey used for relationships
          isPrimaryKey: c.isPrimaryKey,
        }))

        // 2. Add to Project Store
        const fileId = addFile({
          name: task.sourceName,
          path: task.filePath,
          tableName: task.tableName,
          sheetName:
            task.sourceName === task.fileName ? undefined : task.sourceName,
          status: 'ready', // We assume ready because parseFile already created the table in DuckDB
          columns: columns as any,
          rowCount: task.rowCount,
        })

        addedFileIds.push(fileId)
      }

      // 3. Trigger analysis & UI Switch
      const currentFiles = useProjectStore.getState().files
      checkAutoLink(currentFiles)
      setView('schema')

      // 4. Close
      close()
    } catch (e) {
      console.error('Final ingestion failed', e)
    } finally {
      setProcessing(false)
    }
  }

  const handleNext = () => {
    if (step === 'select') {
      if (tasks.length > 0) setStep('preview')
    } else if (step === 'preview') {
      if (mode === 'append') {
        setStep('target')
      } else {
        setStep('summary')
      }
    } else if (step === 'target') {
      setStep('summary')
    } else if (step === 'summary') {
      handleFinish()
    }
  }

  const handleBack = () => {
    if (step === 'preview') setStep('select')
    else if (step === 'target') setStep('preview')
    else if (step === 'summary') {
      if (mode === 'append') {
        setStep('target')
      } else {
        setStep('preview')
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && close()}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none">
        {/* Header */}
        <div className="px-8 py-5 border-b border-zinc-100 bg-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold tracking-tight uppercase">
            Data Ingestion
          </h2>
          <Steps currentStep={step} />
        </div>

        {/* Content Area */}
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

        {/* Footer */}
        <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-between shrink-0">
          <Button variant="ghost" onClick={close} className="text-zinc-500">
            {t('cancel')}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'select'}
              className="border-zinc-200"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={step === 'select' && tasks.length === 0}
              className="bg-black hover:bg-zinc-800 text-white px-8 font-bold"
            >
              {step === 'summary' ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
