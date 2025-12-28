import React from 'react'
import { useWizardStore } from '../../../stores/useWizardStore'
import { useProjectStore } from '../../../stores/useProjectStore'
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Database,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'

export function SummaryStep() {
  const { tasks, mode, targetTableId } = useWizardStore()
  const { files } = useProjectStore()
  const { t } = useTranslation('common')

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-black text-black uppercase tracking-tight">
            {t('wizard.summary_title')}
          </h3>
          <p className="text-zinc-500 text-sm">
            {t('wizard.summary_count', { count: tasks.length })}
          </p>
        </div>

        <div className="space-y-3">
          {tasks.map(task => {
            const pkColumn = task.columns.find(c => c.isPrimaryKey)
            const targetFile =
              mode === 'append'
                ? files.find(
                    f => f.id === (targetTableId || task.targetTableId)
                  )
                : null
            const displayTargetName =
              mode === 'append'
                ? targetFile?.name || 'Target'
                : task.finalTableName || task.tableName

            return (
              <div
                key={task.id}
                className="bg-white border-2 border-zinc-100 p-4 rounded-xl flex items-center gap-4 shadow-sm"
              >
                <div
                  className={cn(
                    'p-2 rounded-lg shrink-0',
                    (task.fileName || '').endsWith('.csv')
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-green-50 text-green-600'
                  )}
                >
                  {(task.fileName || '').endsWith('.csv') ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 truncate">
                      {task.sourceName}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-300" />
                    <span className="text-xs font-mono text-indigo-600 font-bold truncate">
                      {displayTargetName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                      {task.columns.length} {t('wizard.summary.columns')} ·{' '}
                      {task.rowCount.toLocaleString()}{' '}
                      {t('wizard.summary.rows')}
                    </span>
                    {pkColumn && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-100 flex items-center gap-1">
                        {t('wizard.summary.target')}: {pkColumn.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-indigo-600">
                  <Database className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">
                    DuckDB
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-zinc-900 p-4 rounded-xl text-zinc-400 text-[11px] leading-relaxed">
          <p className="font-bold text-zinc-200 mb-1 uppercase tracking-widest">
            {t('wizard.summary.note_title')}
          </p>
          {t('wizard.summary.note_body')}
        </div>
      </div>
    </div>
  )
}
