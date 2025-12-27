import React, { useMemo } from 'react'
import { useWizardStore } from '../../../stores/useWizardStore'
import { useProjectStore } from '../../../stores/useProjectStore'
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Copy,
  History,
  Info,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group'
import { Label } from '../../ui/label'

export function TargetSelectionStep() {
  const { tasks, currentTaskIndex, updateTask, mode, targetTableId } =
    useWizardStore()
  const { files } = useProjectStore()

  const currentTask = tasks[currentTaskIndex]
  const targetFile = files.find(
    f => f.id === targetTableId || f.id === currentTask?.targetTableId
  )

  if (!currentTask || !targetFile)
    return (
      <div className="h-full flex items-center justify-center text-zinc-400">
        Select a target table to continue.
      </div>
    )

  // Column Matching Logic
  const matchingStats = useMemo(() => {
    const sourceCols = new Set(currentTask.columns.map(c => c.name))
    const targetCols = new Set(targetFile.columns.map(c => c.name))

    const matched = [...sourceCols].filter(c => targetCols.has(c))
    const missingInSource = [...targetCols].filter(c => !sourceCols.has(c))
    const extraInSource = [...sourceCols].filter(c => !targetCols.has(c))

    return { matched, missingInSource, extraInSource }
  }, [currentTask, targetFile])

  const setStrategy = (val: 'ignore' | 'replace') => {
    updateTask(currentTaskIndex, { conflictStrategy: val })
  }

  const strategy = currentTask.conflictStrategy || 'ignore'

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50/30">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* 1. Target Info */}
          <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0_0_#000] flex items-center gap-6">
            <div className="w-12 h-12 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Appending to
              </span>
              <h3 className="text-xl font-black text-black uppercase truncate">
                {targetFile.name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                {targetFile.columns.length} Fields
              </span>
            </div>
          </div>

          {/* 2. Column Matching Summary */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">
              Field Matching
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 border border-zinc-200 rounded-xl">
                <div className="text-2xl font-black text-emerald-600">
                  {matchingStats.matched.length}
                </div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase">
                  Matched
                </div>
              </div>
              <div className="bg-white p-4 border border-zinc-200 rounded-xl">
                <div className="text-2xl font-black text-amber-500">
                  {matchingStats.missingInSource.length}
                </div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase">
                  Missing in Source
                </div>
              </div>
              <div className="bg-white p-4 border border-zinc-200 rounded-xl">
                <div className="text-2xl font-black text-zinc-400">
                  {matchingStats.extraInSource.length}
                </div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase">
                  Extra in Source
                </div>
              </div>
            </div>

            {matchingStats.extraInSource.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-tight font-medium">
                  Notice: {matchingStats.extraInSource.length} fields in the new
                  file don't exist in the target table and will be ignored.
                </p>
              </div>
            )}
          </div>

          {/* 3. Conflict Strategy */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Conflict Resolution
              </h4>
              <div title="Triggered when a record with the same Unique Key is found">
                <Info className="w-3 h-3 text-zinc-300" />
              </div>
            </div>

            <RadioGroup
              value={strategy}
              onValueChange={val => setStrategy(val as any)}
              className="grid grid-cols-1 gap-3"
            >
              <Label
                htmlFor="strat-ignore"
                className={cn(
                  'flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all bg-white',
                  strategy === 'ignore'
                    ? 'border-black shadow-md ring-1 ring-black/5'
                    : 'border-zinc-100 hover:border-zinc-200'
                )}
              >
                <div className="flex items-center gap-4">
                  <RadioGroupItem
                    value="ignore"
                    id="strat-ignore"
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      strategy === 'ignore'
                        ? 'bg-black text-white'
                        : 'bg-zinc-50 text-zinc-400'
                    )}
                  >
                    <History className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900">
                      Keep Existing Data
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      Skip new records if they match an existing Unique Key.
                    </span>
                  </div>
                </div>
                {strategy === 'ignore' && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                )}
              </Label>

              <Label
                htmlFor="strat-replace"
                className={cn(
                  'flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all bg-white',
                  strategy === 'replace'
                    ? 'border-black shadow-md ring-1 ring-black/5'
                    : 'border-zinc-100 hover:border-zinc-200'
                )}
              >
                <div className="flex items-center gap-4">
                  <RadioGroupItem
                    value="replace"
                    id="strat-replace"
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      strategy === 'replace'
                        ? 'bg-black text-white'
                        : 'bg-zinc-50 text-zinc-400'
                    )}
                  >
                    <Copy className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900">
                      Overwrite with New Data
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      Replace existing records with information from the new
                      file.
                    </span>
                  </div>
                </div>
                {strategy === 'replace' && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                )}
              </Label>
            </RadioGroup>
          </div>
        </div>
      </div>
    </div>
  )
}
