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
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Link2,
  Check,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group'
import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { sanitizeTableName } from '@shared/naming-utils'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('common')
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

  // Trigger Pre-check (for Append Mode)
  useEffect(() => {
    if (!currentTask || !targetFile || mode !== 'append') return
    if (pkNames.length === 0) return

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
          tempFilePath: currentTask.tempFilePath,
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
    currentTaskIndex,
    JSON.stringify(pkNames),
    targetFile?.id,
    mode,
    JSON.stringify(currentTask?.columnMapping),
  ])

  if (!currentTask) return null

  const handleRename = (index: number, val: string) => {
    const sanitized = sanitizeTableName(val, undefined, '')
    updateTask(index, { finalTableName: sanitized })
  }

  const strategy = currentTask.conflictStrategy || 'ignore'
  const mappedCount = Object.values(currentTask.columnMapping || {}).filter(
    Boolean
  ).length

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50/30">
      {/* Header */}
      <div className="px-8 py-4 bg-zinc-100/50 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              {mode === 'append' ? 'Target Decision' : 'Target Configurations'}
            </span>
            <span className="text-sm font-bold text-zinc-900 mt-1">
              {mode === 'append'
                ? `Appending to ${targetFile?.name}`
                : `${tasks.length} Assets Pending`}
            </span>
          </div>
        </div>

        {mode === 'append' && tasks.length > 1 && (
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

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {mode === 'import' ? (
            /* --- IMPORT MODE: Multi-Task List --- */
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_40px_1fr] px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>{t('wizard.configuring_asset')}</span>
                <span />
                <span>{t('wizard.target_table')}</span>
              </div>

              <div className="space-y-3">
                {tasks.map((task, idx) => {
                  const isTaken = files.some(
                    f => f.tableName === task.finalTableName
                  )
                  return (
                    <div
                      key={task.id}
                      className="group flex items-center gap-4 bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm hover:border-indigo-200 transition-all"
                    >
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0">
                          {task.fileName.endsWith('.csv') ? (
                            <FileText className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate">
                            {task.sourceName}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {task.fileName}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-200 shrink-0" />
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all',
                            isTaken
                              ? 'bg-rose-50 border-rose-200'
                              : 'bg-zinc-50 border-transparent group-hover:bg-white group-hover:border-indigo-100'
                          )}
                        >
                          <Database
                            className={cn(
                              'w-3.5 h-3.5',
                              isTaken ? 'text-rose-500' : 'text-zinc-400'
                            )}
                          />
                          <Input
                            value={task.finalTableName || ''}
                            onChange={e => handleRename(idx, e.target.value)}
                            className="h-6 text-sm font-mono font-bold p-0 border-none bg-transparent focus-visible:ring-0 shadow-none"
                          />
                          {isTaken ? (
                            <div title={t('wizard.name_taken')}>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                          ) : (
                            <Edit3 className="w-3 h-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* --- APPEND MODE: High Density UI --- */
            <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2">
              {/* Conflict Status Card */}
              {pkNames.length > 0 ? (
                <div
                  className={cn(
                    'p-8 rounded-[2rem] border-2 transition-all duration-500 text-center relative overflow-hidden',
                    isPreChecking
                      ? 'bg-zinc-50 border-zinc-100'
                      : (preCheck?.duplicateRows || 0) > 0
                        ? 'bg-rose-50 border-rose-100'
                        : 'bg-emerald-50 border-emerald-100'
                  )}
                >
                  <div className="flex flex-col items-center gap-4 relative z-10">
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
                        Matching existing records via:{' '}
                        <span className="font-bold text-indigo-600">
                          {pkNames.join(', ')}
                        </span>
                      </p>
                    </div>
                    {!isPreChecking && preCheck && (
                      <div className="mt-2 flex items-center gap-4 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                        <span>
                          {preCheck.totalRows.toLocaleString()} Rows in file
                        </span>
                        <div className="w-1 h-1 rounded-full bg-zinc-200" />
                        <span>
                          {preCheck.duplicateRows.toLocaleString()} existing
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-amber-200 bg-amber-50/30 rounded-[2rem] flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="max-w-xs">
                    <h4 className="text-lg font-bold text-amber-900 uppercase tracking-tight">
                      No Unique Key
                    </h4>
                    <p className="text-xs text-amber-700 mt-1 font-medium leading-normal">
                      Data will be appended directly. This may create duplicate
                      records as no identifier is set.
                    </p>
                  </div>
                </div>
              )}

              {/* Strategy Selection - Optimized */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400 justify-center">
                  <div className="h-px w-12 bg-zinc-200" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Conflict Strategy
                  </h4>
                  <div className="h-px w-12 bg-zinc-200" />
                </div>

                <RadioGroup
                  value={strategy}
                  onValueChange={val =>
                    updateTask(currentTaskIndex, {
                      conflictStrategy: val as any,
                    })
                  }
                  className="grid grid-cols-1 gap-3"
                >
                  <Label
                    htmlFor="strat-ignore"
                    className={cn(
                      'flex items-center justify-between p-5 border transition-all cursor-pointer rounded-2xl group',
                      strategy === 'ignore'
                        ? 'bg-indigo-50/50 border-indigo-200 ring-4 ring-indigo-50'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <RadioGroupItem
                        value="ignore"
                        id="strat-ignore"
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm',
                          strategy === 'ignore'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200'
                        )}
                      >
                        <History className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span
                          className={cn(
                            'text-base font-bold',
                            strategy === 'ignore'
                              ? 'text-indigo-900'
                              : 'text-zinc-900'
                          )}
                        >
                          {t('wizard.strategy_ignore_title')}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium leading-relaxed max-w-sm">
                          {t('wizard.strategy_ignore_desc')}
                        </span>
                      </div>
                    </div>
                    {strategy === 'ignore' ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-zinc-100 group-hover:border-zinc-200" />
                    )}
                  </Label>

                  <Label
                    htmlFor="strat-replace"
                    className={cn(
                      'flex items-center justify-between p-5 border transition-all cursor-pointer rounded-2xl group',
                      strategy === 'replace'
                        ? 'bg-indigo-50/50 border-indigo-200 ring-4 ring-indigo-50'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <RadioGroupItem
                        value="replace"
                        id="strat-replace"
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm',
                          strategy === 'replace'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200'
                        )}
                      >
                        <Copy className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span
                          className={cn(
                            'text-base font-bold',
                            strategy === 'replace'
                              ? 'text-indigo-900'
                              : 'text-zinc-900'
                          )}
                        >
                          {t('wizard.strategy_replace_title')}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium leading-relaxed max-w-sm">
                          {t('wizard.strategy_replace_desc')}
                        </span>
                      </div>
                    </div>
                    {strategy === 'replace' ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-zinc-100 group-hover:border-zinc-200" />
                    )}
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
