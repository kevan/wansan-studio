import React, { useMemo, useEffect, useState } from 'react'
import { useWizardStore } from '../../../stores/useWizardStore'
import { useProjectStore } from '../../../stores/useProjectStore'
import {
  CheckCircle2,
  AlertCircle,
  Database,
  Copy,
  History,
  Info,
  Loader2,
  Edit3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group'
import { Label } from '../../ui/label'
import { Input } from '../../ui/input'

export function TargetSelectionStep() {
  const {
    tasks,
    currentTaskIndex,
    updateTask,
    mode,
    targetTableId,
    nextTask,
    prevTask,
  } = useWizardStore()
  const { files } = useProjectStore()
  const [isPreChecking, setIsPreChecking] = useState(false)

  const currentTask = tasks[currentTaskIndex]

  const targetFile = files.find(f => f.id === targetTableId)

  // Use PKs from TARGET file for Append Mode, or from Task config for Import Mode

  const pkNames = useMemo(() => {
    if (mode === 'append' && targetFile) {
      return targetFile.columns
        .filter(c => c.isPrimaryKey || c.isKey)
        .map(c => c.name)
    }

    return (
      currentTask?.columns.filter(c => c.isPrimaryKey).map(c => c.name) || []
    )
  }, [mode, targetFile, currentTask?.columns])

  const preCheck = currentTask?.preCheckResult

  // Collision Check for Import Mode
  const isTableNameTaken = useMemo(() => {
    if (mode !== 'import' || !currentTask?.finalTableName) return false
    return files.some(f => f.tableName === currentTask.finalTableName)
  }, [files, currentTask?.finalTableName, mode])

  // Trigger Pre-check (for Append Mode)
  useEffect(() => {
    if (!currentTask || !targetFile || mode !== 'append') return

    // If no PKs selected, clear pre-check and skip
    if (pkNames.length === 0) {
      if (currentTask.preCheckResult) {
        updateTask(currentTaskIndex, { preCheckResult: undefined })
      }
      return
    }

    const runPreCheck = async () => {
      setIsPreChecking(true)
      try {
        const res = await window.electronAPI.ingestPreCheck({
          filePath: currentTask.filePath,
          targetTableName: targetFile.tableName,
          sheetName:
            currentTask.sourceName === currentTask.fileName
              ? undefined
              : currentTask.sourceName,
          uniqueKeys: pkNames,
          columnMapping: currentTask.columnMapping || {},
          tempFilePath: currentTask.tempFilePath, // Pass cached path
        })

        if (res.success && res.data) {
          updateTask(currentTaskIndex, { preCheckResult: res.data })
        }
      } catch (err) {
        console.error('Pre-check failed', err)
      } finally {
        setIsPreChecking(false)
      }
    }

    runPreCheck()
  }, [
    currentTask?.id,
    JSON.stringify(pkNames),
    targetFile?.id,
    mode,
    currentTaskIndex,
    JSON.stringify(currentTask?.columnMapping),
  ])

  if (!currentTask) return null

  const handleRename = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    updateTask(currentTaskIndex, { finalTableName: sanitized })
  }

  const setStrategy = (val: 'ignore' | 'replace') => {
    updateTask(currentTaskIndex, { conflictStrategy: val })
  }
  const strategy = currentTask.conflictStrategy || 'ignore'

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50/30">
      {/* Task Nav Header */}
      <div className="px-8 py-4 bg-zinc-100/50 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              {mode === 'append' ? 'Review Conflicts' : 'Confirm Table Name'}
            </span>
            <span className="text-sm font-bold text-zinc-900 mt-1">
              {currentTask.sourceName}
            </span>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              Progress
            </span>
            <span className="text-sm font-bold text-zinc-900 mt-1">
              {currentTaskIndex + 1} of {tasks.length}
            </span>
          </div>
        </div>

        {tasks.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={prevTask}
              disabled={currentTaskIndex === 0}
              className="p-1.5 rounded-md hover:bg-zinc-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextTask}
              disabled={currentTaskIndex === tasks.length - 1}
              className="p-1.5 rounded-md hover:bg-zinc-200 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        <div className="max-w-2xl mx-auto space-y-10">
          {mode === 'import' ? (
            /* --- IMPORT MODE: Rename Table --- */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 pl-1">
                  Target Table Name
                </h4>
                <div
                  className={cn(
                    'bg-white border-2 p-5 rounded-2xl flex items-center gap-4 transition-all shadow-sm',
                    isTableNameTaken
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-zinc-200 focus-within:border-indigo-500'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-tighter leading-none">
                      Table Name
                    </span>
                    <div className="relative mt-0.5">
                      <Input
                        value={currentTask.finalTableName || ''}
                        onChange={e => handleRename(e.target.value)}
                        className="h-7 text-sm font-bold p-0 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="t_new_table"
                      />
                      <Edit3 className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-300 pointer-events-none" />
                    </div>
                  </div>
                </div>
                {isTableNameTaken && (
                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in shake duration-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-tight">
                      Name already taken. Please choose another.
                    </span>
                  </div>
                )}
              </div>

              <div className="p-8 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-white/50">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="max-w-xs">
                  <h4 className="text-lg font-bold text-zinc-900 uppercase tracking-tight">
                    New Table Ready
                  </h4>
                  <p className="text-sm text-zinc-500 mt-2 font-medium">
                    This file will be imported as a new table. Proceed to the
                    final summary.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* --- APPEND MODE: Conflict Check --- */
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
              {pkNames.length > 0 ? (
                <div
                  className={cn(
                    'p-8 rounded-2xl border-2 transition-all duration-500 text-center',
                    isPreChecking
                      ? 'bg-zinc-50 border-zinc-100'
                      : (preCheck?.duplicateRows || 0) > 0
                        ? 'bg-rose-50 border-rose-100'
                        : 'bg-emerald-50 border-emerald-100'
                  )}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center shadow-sm',
                        isPreChecking
                          ? 'bg-zinc-200'
                          : (preCheck?.duplicateRows || 0) > 0
                            ? 'bg-rose-500 text-white'
                            : 'bg-emerald-500 text-white'
                      )}
                    >
                      {isPreChecking ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (preCheck?.duplicateRows || 0) > 0 ? (
                        <AlertCircle className="w-8 h-8" />
                      ) : (
                        <CheckCircle2 className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black uppercase tracking-tight text-zinc-900">
                        {isPreChecking
                          ? 'Analyzing Conflicts...'
                          : (preCheck?.duplicateRows || 0) > 0
                            ? `${preCheck?.duplicateRows} Conflicts Found`
                            : 'No Conflicts Detected'}
                      </h4>
                      <p className="text-sm text-zinc-500 font-medium mt-1">
                        Unique Keys:{' '}
                        <span className="font-bold text-indigo-600">
                          {pkNames.join(', ')}
                        </span>
                      </p>
                    </div>
                    {!isPreChecking && preCheck && (
                      <div className="mt-2 text-zinc-400 text-xs font-bold uppercase">
                        {preCheck.totalRows.toLocaleString()} New Rows ·{' '}
                        {preCheck.duplicateRows.toLocaleString()} Duplicates
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 border-2 border-amber-100 bg-amber-50/50 rounded-2xl flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="max-w-xs">
                    <h4 className="text-lg font-bold text-amber-900">
                      No Unique Key selected
                    </h4>
                    <p className="text-sm text-amber-700 mt-1 font-medium leading-tight">
                      All rows will be appended without checking for existing
                      records. This may lead to duplicates.
                    </p>
                  </div>
                </div>
              )}

              {/* Strategy Picker */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-500 justify-center">
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    Conflict Resolution Strategy
                  </h4>
                </div>

                <RadioGroup
                  value={strategy}
                  onValueChange={val => setStrategy(val as any)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="strat-ignore"
                    className={cn(
                      'flex flex-col text-center items-center justify-center p-6 border-2 rounded-2xl cursor-pointer transition-all bg-white',
                      strategy === 'ignore'
                        ? 'border-black shadow-lg ring-2 ring-black/5'
                        : 'border-zinc-200 hover:border-zinc-300 shadow-sm'
                    )}
                  >
                    <RadioGroupItem
                      value="ignore"
                      id="strat-ignore"
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors',
                        strategy === 'ignore'
                          ? 'bg-black text-white'
                          : 'bg-zinc-100 text-zinc-400'
                      )}
                    >
                      <History className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-zinc-900">
                      Ignore Duplicates
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium mt-1 leading-tight">
                      Only add new records.
                      <br />
                      Keep existing data.
                    </span>
                  </Label>

                  <Label
                    htmlFor="strat-replace"
                    className={cn(
                      'flex flex-col text-center items-center justify-center p-6 border-2 rounded-2xl cursor-pointer transition-all bg-white',
                      strategy === 'replace'
                        ? 'border-black shadow-lg ring-2 ring-black/5'
                        : 'border-zinc-200 hover:border-zinc-300 shadow-sm'
                    )}
                  >
                    <RadioGroupItem
                      value="replace"
                      id="strat-replace"
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors',
                        strategy === 'replace'
                          ? 'bg-black text-white'
                          : 'bg-zinc-100 text-zinc-400'
                      )}
                    >
                      <Copy className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-zinc-900">
                      Replace Duplicates
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium mt-1 leading-tight">
                      Update existing records
                      <br />
                      with new file data.
                    </span>
                  </Label>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
