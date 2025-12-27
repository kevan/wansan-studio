import React, { useMemo } from 'react'
import { useWizardStore } from '../../../stores/useWizardStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import {
  Hash,
  Type,
  Calendar,
  Clock,
  ToggleLeft,
  Key,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { ColumnType } from '@shared/types'
import { useTranslation } from 'react-i18next'

const TYPE_ICONS: Record<ColumnType, any> = {
  INTEGER: Hash,
  DOUBLE: Hash,
  VARCHAR: Type,
  DATE: Calendar,
  TIMESTAMP: Clock,
  BOOLEAN: ToggleLeft,
}

export function DataPreviewStep() {
  const { tasks, currentTaskIndex, updateColumnConfig, nextTask, prevTask } =
    useWizardStore()
  const { t } = useTranslation('common')

  const currentTask = tasks[currentTaskIndex]
  if (!currentTask) return null

  const handleTypeChange = (columnName: string, type: ColumnType) => {
    updateColumnConfig(currentTaskIndex, columnName, { type })
  }

  const handleTogglePK = (columnName: string, isCurrentlyPK: boolean) => {
    updateColumnConfig(currentTaskIndex, columnName, {
      isPrimaryKey: !isCurrentlyPK,
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Info */}
      <div className="px-8 py-4 bg-zinc-100/50 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Configuring Asset
            </span>
            <span className="text-sm font-bold text-zinc-900">
              {currentTask.sourceName}
            </span>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Progress
            </span>
            <span className="text-sm font-bold text-zinc-900">
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

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto bg-white">
        <Table className="border-separate border-spacing-0">
          <TableHeader className="sticky top-0 z-20 bg-zinc-50 shadow-sm">
            <TableRow>
              {currentTask.columns.map(col => (
                <TableHead
                  key={col.name}
                  className="px-4 py-3 border-b border-r border-zinc-200 min-w-[180px]"
                >
                  <div className="flex flex-col gap-2">
                    {/* PK & Name */}
                    <div className="flex items-center justify-between group">
                      <span
                        className="text-xs font-bold text-zinc-900 truncate pr-2"
                        title={col.name}
                      >
                        {col.name}
                      </span>
                      <button
                        onClick={() =>
                          handleTogglePK(col.name, col.isPrimaryKey)
                        }
                        className={cn(
                          'p-1 rounded transition-colors',
                          col.isPrimaryKey
                            ? 'text-indigo-600 bg-indigo-50'
                            : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100'
                        )}
                        title="Set as unique key"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Type Selector */}
                    <Select
                      value={col.type}
                      onValueChange={val =>
                        handleTypeChange(col.name, val as ColumnType)
                      }
                    >
                      <SelectTrigger className="h-7 text-[10px] font-bold bg-white border-zinc-200 uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VARCHAR">Text</SelectItem>
                        <SelectItem value="DOUBLE">Number</SelectItem>
                        <SelectItem value="DATE">Date</SelectItem>
                        <SelectItem value="TIMESTAMP">Date Time</SelectItem>
                        <SelectItem value="BOOLEAN">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTask.previewData.map((row, rowIdx) => (
              <TableRow key={rowIdx} className="hover:bg-zinc-50/50">
                {currentTask.columns.map(col => (
                  <TableCell
                    key={col.name}
                    className="px-4 py-2 text-xs text-zinc-600 border-r border-zinc-100 font-mono"
                  >
                    {row[col.name] !== null ? (
                      String(row[col.name])
                    ) : (
                      <span className="opacity-20 italic">null</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Helper Footer */}
      <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center gap-2 shrink-0">
        <Info className="w-4 h-4 text-blue-500" />
        <p className="text-[11px] text-zinc-500 font-medium">
          Verify data types and optionally set a{' '}
          <span className="text-indigo-600 font-bold">Unique Key</span> (🔑) to
          prevent duplicates during future updates.
        </p>
      </div>
    </div>
  )
}
