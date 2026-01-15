import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Lock,
  Minus,
  Monitor,
  Plus,
  Printer,
  Type,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CanvasLayout, useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useToastStore } from '@/stores/useToastStore'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { PAGE_GAP_PX } from '@/components/dashboard-v3/page-layer'
import { useTranslation } from 'react-i18next'
import { Analytics } from '../../services/analytics'
import logo from '@/src/assets/logo.png'
import { useExportWebReport } from '@/hooks/useIPC'
import { ExportLoadingModal } from '../modals/ExportLoadingModal'
import { useProGate } from '@/hooks/use-pro-gate'

export function DashboardHeader() {
  const { canvasConfig, setCanvasConfig, setLayoutScenario } =
    useWorkbenchStore()
  const pageCount = useWorkbenchStore(state => state.pageCount)
  const setPageCount = useWorkbenchStore(state => state.setPageCount)
  // const layoutScenario = useWorkbenchStore(state => state.layoutScenario)
  const isA4 = canvasConfig.layout === 'a4'
  const isReport = canvasConfig.layout === 'report'
  const { t } = useTranslation('common')
  const { isActivated, language } = useSettingsStore()
  const addToast = useToastStore(state => state.addToast)
  const addWidget = useProjectStore(state => state.addWidget)
  const { mutateAsync: exportWebReport } = useExportWebReport()
  const [isExportingWeb, setIsExportingWeb] = useState(false)
  const { checkGate, gateNode } = useProGate()

  const handleExportWeb = async () => {
    const { pinnedReports, canvasConfig } = useWorkbenchStore.getState()

    // 1. Check if in Report Mode
    if (!isReport) {
      addToast({
        title: t('warning'),
        description: t('export_web_report_hint', 'Web Export is only available in Report Mode. Please switch view first.'),
        type: 'warning',
      })
      return
    }

    Analytics.track('export_clicked', { format: 'html' })
    setIsExportingWeb(true)
    try {
      const filePath = await exportWebReport({
        widgets: pinnedReports,
        config: {
          title: canvasConfig.title || t('default_report_title'),
          theme: 'minimal',
          language: language as 'en' | 'zh',
        },
        fullSnapshot: {
          workbench: { canvasConfig },
          settings: {
            showChartLabels: useSettingsStore.getState().showChartLabels,
          },
        },
      })
      addToast({
        title: t('web_report_generated'),
        description: filePath,
        type: 'success',
        action: {
          label: t('open_folder'),
          onClick: () => window.electronAPI.showItemInFolder(filePath),
        },
      })
    } catch (e) {
      console.error(e)
      if (String(e).includes('Cancelled')) return
      addToast({ title: t('export_failed', 'Export Failed'), type: 'error' })
    } finally {
      setIsExportingWeb(false)
    }
  }

  const insertTextWidget = () => {
    const widgetId = crypto.randomUUID()
    const id = crypto.randomUUID()

    // Intelligent Positioning Logic
    const state = useProjectStore.getState()
    const session = state.sessions.find(s => s.id === state.activeSessionId)
    const widgets = session?.dashboard.widgets || []
    const currentPage = pageCount - 1 // Default to last page

    // Filter widgets on the target page
    const pageWidgets = widgets.filter(w => (w.pageIndex || 0) === currentPage)

    // Find max Y + H on this page
    let maxY = 0
    pageWidgets.forEach(w => {
      const bottom = w.layout.y + w.layout.h
      if (bottom > maxY) maxY = bottom
    })

    let targetY = maxY
    let targetPage = currentPage

    // Check if it fits on this page (A4 Mode Only)
    const WIDGET_HEIGHT = 2
    const MAX_ROWS = 27

    if (isA4 && targetY + WIDGET_HEIGHT > MAX_ROWS) {
      // Move to next page
      targetPage = currentPage + 1
      targetY = 0
      if (targetPage >= pageCount) {
        setPageCount(targetPage + 1)
      }
    }

    addWidget({
      id,
      sourceMessageId: 'manual',
      widgetId,
      reportData: {
        title: t('text_block', 'Text Block'),
        content: t('new_section', 'New Section'),
        chartType: 'text',
        timestamp: Date.now(),
      },
      layout: { i: id, x: 0, y: targetY, w: 12, h: WIDGET_HEIGHT },
      pageIndex: targetPage,
    })
  }

  const updateConfig = (key: keyof typeof canvasConfig, value: unknown) => {
    setCanvasConfig({ [key]: value } as Partial<typeof canvasConfig>)
  }

  const handleLayoutChange = (value: CanvasLayout) => {
    Analytics.track('layout_switched', { mode: value })
    updateConfig('layout', value)
    setLayoutScenario(value === 'a4' ? 'print' : 'default')
  }

  const handleExport = async (type: 'pdf' | 'png' | 'raw' = 'pdf') => {
    if (type === 'raw') {
      // Default to PDF for generic call
      handleExport('pdf')
      return
    }

    const node = document.getElementById('dashboard-export-root')
    if (!node) {
      console.warn('dashboard-export-root not found for export')
      return
    }

    const originalZoom = canvasConfig.zoom
    setCanvasConfig({ zoom: 100 })
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: el =>
          !el.classList?.contains('card-controls') &&
          !el.classList?.contains('hide-on-export'),
      })

      const logoImg = new Image()
      await new Promise<void>(resolve => {
        logoImg.onload = () => resolve()
        logoImg.onerror = () => resolve()
        logoImg.src = logo
      })

      const fileName = `${canvasConfig.title || 'Report'}.${type === 'png' ? 'png' : 'pdf'}`

      if (type === 'png') {
        Analytics.track('export_clicked', { format: 'png' })

        const img = new Image()
        img.src = dataUrl
        await new Promise(r => {
          img.onload = r
        })

        const logoSize = Math.max(24, img.width * 0.025)
        const fontSize = Math.max(12, img.width * 0.012)
        const footerHeightPx = logoSize * 3

        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height + footerHeightPx
        const ctx = canvas.getContext('2d')

        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)

          ctx.globalAlpha = 0.6
          const footerY = img.height + footerHeightPx / 2 - logoSize / 2
          const marginX = logoSize
          ctx.drawImage(logoImg, marginX, footerY, logoSize, logoSize)

          const textX = marginX + logoSize + logoSize * 0.5
          const textY = footerY + logoSize / 2
          ctx.font = `500 ${fontSize}px sans-serif`
          ctx.fillStyle = '#71717a'
          ctx.textBaseline = 'middle'
          ctx.fillText('Created with Wansan Studio', textX, textY)
        }

        const result = await window.electronAPI?.saveImage(
          canvas.toDataURL('image/png'),
          fileName
        )
        
        if (result.success && result.data) {
          const filePath = result.data as string
          addToast({
            title: t('image_saved', 'Image Saved'),
            description: filePath,
            type: 'success',
            action: {
              label: t('open_folder', 'Open Folder'),
              onClick: () => window.electronAPI.showItemInFolder(filePath),
            },
          })
        }
        return
      }

      if (type === 'pdf') {
        Analytics.track('export_clicked', { format: 'pdf' })
      }

      const img = new Image()
      img.src = dataUrl
      await new Promise(r => {
        img.onload = r
      })

      const pdf = new jsPDF({
        orientation: (isA4 || isReport) ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const footerHeightMM = isA4 ? 0 : 8
      const contentHeightMM = pdfHeight - footerHeightMM
      const sliceHeight = img.width * (contentHeightMM / pdfWidth)
      const ratio = img.width / (node.offsetWidth || 1)
      const gapHeight = isA4 ? PAGE_GAP_PX * ratio : 0
      const loopCount = isA4 ? pageCount : Math.ceil(img.height / sliceHeight)

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = sliceHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2d context for slicing')
      }

      for (let i = 0; i < loopCount; i++) {
        if (i > 0) pdf.addPage()
        const srcY = i * (sliceHeight + gapHeight)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(
          img,
          0,
          srcY,
          img.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        )
        const sliceData = canvas.toDataURL('image/png')
        pdf.addImage(sliceData, 'PNG', 0, 0, pdfWidth, contentHeightMM)

        const footerY = pdfHeight - 3
        pdf.addImage(logoImg, 'PNG', 10, footerY - 3, 3, 3)
        pdf.setFontSize(7)
        pdf.setTextColor(120, 120, 120)
        pdf.text('Created with Wansan Studio', 16, footerY - 1)
        pdf.text(`Page ${i + 1}`, pdfWidth - 10, footerY - 1, {
          align: 'right',
        })
      }

      pdf.save(fileName)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setCanvasConfig({ zoom: originalZoom })
    }
  }

  return (
    <div className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0 z-20 relative">
      {gateNode}
      <ExportLoadingModal isOpen={isExportingWeb} />
      {/* LEFT: Actions */}
      <div className="flex items-center gap-2 w-[200px]">
        <Button
          variant="outline"
          size="sm"
          onClick={insertTextWidget}
          title={t('insert_section', 'New Section')}
          className="h-8 gap-2 bg-white hover:bg-zinc-50 border-zinc-200 shadow-sm"
        >
          <Type className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-700 text-xs">
            {t('insert_section', 'New Section')}
          </span>
        </Button>
      </div>

      {/* CENTER: View Controls */}
      <div className="flex items-center gap-3">
        {/* Zoom Control (Hide in Report Mode) */}
        {canvasConfig.layout !== 'report' && (
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-700 h-8">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sm hover:bg-white hover:shadow-sm"
              onClick={() =>
                updateConfig('zoom', Math.max(50, canvasConfig.zoom - 10))
              }
            >
              <Minus className="w-3 h-3 text-zinc-600" />
            </Button>
            <span className="text-xs font-medium font-mono w-10 text-center text-zinc-700 dark:text-zinc-300 select-none">
              {Math.round(canvasConfig.zoom)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sm hover:bg-white hover:shadow-sm"
              onClick={() =>
                updateConfig('zoom', Math.min(200, canvasConfig.zoom + 10))
              }
            >
              <Plus className="w-3 h-3 text-zinc-600" />
            </Button>
          </div>
        )}

        {/* Page Control (Conditional) */}
        {isA4 && (
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-700 h-8">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sm hover:bg-white hover:shadow-sm"
              disabled={pageCount <= 1}
              onClick={() => setPageCount(Math.max(1, pageCount - 1))}
              title={t('remove_page')}
            >
              <ChevronLeft className="w-3 h-3 text-zinc-600" />
            </Button>
            <span className="text-xs font-medium font-mono w-8 text-center text-zinc-700 dark:text-zinc-300 select-none">
              {pageCount}P
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sm hover:bg-white hover:shadow-sm"
              onClick={() => setPageCount(pageCount + 1)}
              title={t('add_page')}
            >
              <ChevronRight className="w-3 h-3 text-zinc-600" />
            </Button>
          </div>
        )}
      </div>

      {/* RIGHT: System & Export */}
      <div className="flex items-center gap-3 w-[240px] justify-end">
        {/* Layout Switcher (Primary Control) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs border-zinc-200 shadow-sm"
            >
              {canvasConfig.layout === 'report' ? (
                <FileText className="h-3.5 w-3.5 text-zinc-500" />
              ) : canvasConfig.layout === 'a4' ? (
                <Printer className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <Monitor className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <span className="hidden sm:inline">
                {canvasConfig.layout === 'report'
                  ? t('view_report')
                  : canvasConfig.layout === 'a4'
                    ? t('layout_print')
                    : t('layout_screen')}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuRadioGroup
              value={canvasConfig.layout}
              onValueChange={val => handleLayoutChange(val as CanvasLayout)}
            >
              <DropdownMenuRadioItem value="report">
                {t('view_report')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="screen">
                {t('view_dashboard')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="a4">
                {t('layout_print')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-8 gap-2 bg-black hover:bg-zinc-800 text-white shadow-sm"
            >
              {!isActivated ? (
                <Lock className="h-3.5 w-3.5 text-yellow-400" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">{t('export')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() =>
                checkGate(t('export_pdf'), () => handleExport('pdf'))
              }
            >
              {t('export_pdf')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                checkGate(t('export_png'), () => handleExport('png'))
              }
            >
              {t('export_png')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isExportingWeb}
              onSelect={() =>
                checkGate(t('export_web_report'), handleExportWeb)
              }
            >
              {t('export_web_report')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
