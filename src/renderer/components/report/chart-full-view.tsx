import React, { useEffect, useMemo, useState } from 'react'
import { X, Save } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { VizControls } from './viz-controls'
import { A4Chart } from '../A4Canvas'
import { ReportTable } from './report-table'
import { BigNumberDisplay } from '../BigNumberDisplay'
import { cn } from '@/utils/cn'
import type { ReportData } from '@/stores/useWorkbenchStore'
import { useTranslation } from 'react-i18next'

export function ChartFullView() {
  const editingReportId = useWorkbenchStore(state => state.editingReportId)
  const setEditingReportId = useWorkbenchStore(state => state.setEditingReportId)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const updateReportConfig = useWorkbenchStore(state => state.updateReportConfig)
  const updateReportTitle = useWorkbenchStore(state => state.updateReportTitle)
  const { t } = useTranslation('common')

  const report = useMemo(
    () => pinnedReports.find(r => r.id === editingReportId),
    [editingReportId, pinnedReports]
  )

  const [localType, setLocalType] = useState<ReportData['chartType']>('bar')
  const [localConfig, setLocalConfig] = useState<ReportData['vizConfig'] | undefined>(undefined)
  const [localTitle, setLocalTitle] = useState('')

  useEffect(() => {
    if (!report) return
    setLocalType(report.reportData.chartType ?? 'bar')
    setLocalConfig(report.reportData.vizConfig)
    setLocalTitle(report.reportData.title ?? '')
  }, [report])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditingReportId(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setEditingReportId])

  if (!editingReportId) return null
  if (!report) {
    console.error('Report not found for editing id:', editingReportId)
    return null
  }
  if (typeof window === 'undefined') {
    return null
  }

  const data = report.reportData.tableData || []
  const columns =
    (report.reportData.columns && report.reportData.columns.length > 0
      ? report.reportData.columns
      : data[0]
        ? Object.keys(data[0])
        : []) || []

  const effectiveType = localType ?? report.reportData.chartType ?? 'bar'

  const isBigNumber =
    (effectiveType === 'table' || effectiveType === 'kpi') &&
    data.length === 1 &&
    Object.keys(data[0] || {}).length > 0

  const showTable =
    data.length > 0 &&
    !isBigNumber &&
    (effectiveType === 'table' ||
      !localConfig?.x_axis ||
      !localConfig?.y_axis)

  const handleSave = () => {
    if (!report) return
    updateReportConfig(report.id, {
      type: effectiveType as any,
      config: localConfig,
    })
    if (localTitle.trim() && localTitle !== report.reportData.title) {
      updateReportTitle(report.id, localTitle.trim())
    }
    setEditingReportId(null)
  }

  const handleConfigChange = (updates: { type?: any; config?: any }) => {
    if (updates.type !== undefined) setLocalType(updates.type)
    if (updates.config !== undefined) {
      setLocalConfig(prev => ({ ...(prev || {}), ...updates.config }))
    }
  }

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="relative flex h-[80vh] w-[80vw] max-w-6xl rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <input
                className="w-full max-w-lg border-none text-lg font-semibold text-zinc-900 outline-none focus:ring-0"
                value={localTitle}
                onChange={e => setLocalTitle(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingReportId(null)}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
                >
                  <X className="h-4 w-4" />
                  {t('close')}
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
                >
                  <Save className="h-4 w-4" />
                  {t('save')}
                </button>
              </div>
            </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-5">
              <div className="h-full w-full rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
                {isBigNumber && data.length > 0 && (
                  <BigNumberDisplay
                    value={Object.values(data[0])[0]}
                    label={Object.keys(data[0])[0]}
                    variant="dashboard"
                  />
                )}

                {!isBigNumber && effectiveType !== 'table' && effectiveType !== 'kpi' && (
                  <A4Chart
                    type={effectiveType}
                    title={localTitle}
                    data={data}
                    config={localConfig}
                    className="h-full w-full"
                  />
                )}

                {showTable && (
                  <div className="h-full w-full overflow-auto">
                    <ReportTable data={data} columns={columns} variant="dashboard" />
                  </div>
                )}

                {!data.length && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    {t('no_data')}
                  </div>
                )}
              </div>
            </div>

            <div className={cn('w-[320px] border-l border-zinc-200 bg-white p-4')}>
              <div className="mb-3 text-sm font-semibold text-zinc-700">
                Visualization Controls
              </div>
              <VizControls
                vizType={localType}
                vizConfig={localConfig}
                columns={columns}
                data={data}
                onChange={handleConfigChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
