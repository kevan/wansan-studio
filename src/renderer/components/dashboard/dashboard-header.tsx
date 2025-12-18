import { useState } from 'react'
import {
  Download,
  ChevronDown,
  FileImage,
  FileText,
  Monitor,
  Printer,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Lock,
  RefreshCw,
  Type,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { CanvasLayout, useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useToastStore } from '@/stores/useToastStore'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import {
  PAGE_GAP_PX,
  PAGE_HEIGHT_PX,
} from '@/components/dashboard-v3/page-layer'
import { useTranslation } from 'react-i18next'
import { Analytics } from '../../services/analytics'
import logo from '@/src/assets/logo.png'

export function DashboardHeader() {
  const { canvasConfig, setCanvasConfig, setLayoutScenario } =
    useWorkbenchStore()
  const pageCount = useWorkbenchStore(state => state.pageCount)
  const setPageCount = useWorkbenchStore(state => state.setPageCount)
  const layoutScenario = useWorkbenchStore(state => state.layoutScenario)
  const isA4 = canvasConfig.layout === 'a4'
  const { t } = useTranslation('common')
  const { isActivated } = useSettingsStore()
  const addToast = useToastStore(state => state.addToast)
  const refreshSessionWidgets = useProjectStore(state => state.refreshSessionWidgets)
  const addWidget = useProjectStore(state => state.addWidget)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await refreshSessionWidgets()
      addToast({ title: t('reload_success'), type: 'success' })
    } catch (e) {
      console.error(e)
      addToast({ title: t('reload_failed'), type: 'error' })
    } finally {
      setIsRefreshing(false)
    }
  }

  const updateConfig = (key: keyof typeof canvasConfig, value: unknown) => {
    setCanvasConfig({ [key]: value } as Partial<typeof canvasConfig>)
  }

  const handleLayoutChange = (value: CanvasLayout) => {
    updateConfig('layout', value)
    setLayoutScenario(value === 'a4' ? 'print' : 'default')
  }

  const handleExport = async (type: 'pdf' | 'png') => {
    if (!isActivated) {
      addToast({
        title: t('pro_feature_title'),
        description: t('pro_feature_export_desc'),
        type: 'info',
      })
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
        await new Promise(r => { img.onload = r })

        // Dynamic sizing for watermark based on image width
        // Base scale: 3840px -> Logo ~96px, Font ~46px
        const logoSize = Math.max(24, img.width * 0.025)
        const fontSize = Math.max(12, img.width * 0.012)
        const footerHeightPx = logoSize * 3 // Enough padding

        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height + footerHeightPx
        const ctx = canvas.getContext('2d')

        if (ctx) {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)
            
            // Draw Watermark
            ctx.globalAlpha = 0.6
            const footerY = img.height + (footerHeightPx / 2) - (logoSize / 2)
            const marginX = logoSize
            
            // Logo
            ctx.drawImage(logoImg, marginX, footerY, logoSize, logoSize)
            
            // Text
            const textX = marginX + logoSize + (logoSize * 0.5)
            const textY = footerY + (logoSize / 2)
            ctx.font = `500 ${fontSize}px sans-serif`
            ctx.fillStyle = '#71717a' // zinc-500
            ctx.textBaseline = 'middle'
            ctx.fillText('Created with Wansan Studio', textX, textY)
        }

        await window.electronAPI?.saveImage(canvas.toDataURL('image/png'), fileName)
        return
      }

      if (type === 'pdf') {
        Analytics.track('export_clicked', { format: 'pdf' })
      }

      const img = new Image()
      img.src = dataUrl
      await new Promise(r => { img.onload = r })

      // Logo is already loaded above as logoImg

      const pdf = new jsPDF({
        orientation: isA4 ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Reserve space for footer only in Screen mode (A4 uses Overlay)
      const footerHeightMM = isA4 ? 0 : 8
      const contentHeightMM = pdfHeight - footerHeightMM

      // Dynamic slice height based on available content area aspect ratio
      const sliceHeight = img.width * (contentHeightMM / pdfWidth)

      // Only A4 mode has visual gaps to skip
      const ratio = img.width / (node.offsetWidth || 1)
      const gapHeight = isA4 ? PAGE_GAP_PX * ratio : 0

      // Calculate actual PDF pages needed based on image height (for Screen mode)
      // For A4, we trust the store's pageCount as it aligns with visual pages
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

        // Draw Watermark Footer
        const footerY = pdfHeight - 3
        
        // Draw Logo
        pdf.addImage(logoImg, 'PNG', 10, footerY - 3, 3, 3)

        // Draw Text
        pdf.setFontSize(7)
        pdf.setTextColor(120, 120, 120) // Darker gray
        pdf.text('Created with Wansan Studio', 16, footerY - 1)

        // Draw Page Number
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
    <div className="h-12 flex items-center justify-end px-4 border-b bg-white/80 backdrop-blur-sm z-10 sticky top-0">
      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2">
        {/* View Options Group */}
        <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm"
            onClick={() =>
              updateConfig('zoom', Math.max(50, canvasConfig.zoom - 10))
            }
          >
            <ZoomOut className="h-3.5 w-3.5 text-zinc-500" />
          </Button>
          <span className="text-xs w-10 text-center font-medium tabular-nums text-zinc-600 whitespace-nowrap">
            {canvasConfig.zoom}
            {isA4 ? '' : '%'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-sm"
            onClick={() =>
              updateConfig('zoom', Math.min(200, canvasConfig.zoom + 10))
            }
          >
            <ZoomIn className="h-3.5 w-3.5 text-zinc-500" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={t('reload_data')}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs"
          onClick={() => {
            const widgetId = crypto.randomUUID()
            const id = crypto.randomUUID()
            
            // Intelligent Positioning Logic
            const state = useProjectStore.getState()
            const session = state.sessions.find(s => s.id === state.activeSessionId)
            const widgets = session?.dashboard.widgets || []
            const currentPage = pageCount - 1 // Default to last page or current focused page if we tracked it
            
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
            // 27 rows per page approx
            const WIDGET_HEIGHT = 2
            const MAX_ROWS = 27 
            
            if (isA4 && (targetY + WIDGET_HEIGHT > MAX_ROWS)) {
                // Move to next page
                targetPage = currentPage + 1
                targetY = 0
                // If page doesn't exist, increment page count
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
          }}
        >
          <Type className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('insert_text', 'Text')}</span>
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {isA4 && (
          <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sm"
              disabled={pageCount <= 1}
              onClick={() => setPageCount(Math.max(1, pageCount - 1))}
              title={t('remove_page')}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs px-2 font-medium tabular-nums text-zinc-600 whitespace-nowrap">
              {pageCount}P
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sm"
              onClick={() => setPageCount(pageCount + 1)}
              title={t('add_page')}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Layout Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
              {canvasConfig.layout === 'a4' ? (
                <Printer className="h-3.5 w-3.5" />
              ) : (
                <Monitor className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {canvasConfig.layout === 'a4'
                  ? t('layout_print')
                  : t('layout_screen')}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={canvasConfig.layout}
              onValueChange={val => handleLayoutChange(val as CanvasLayout)}
            >
              <DropdownMenuRadioItem value="a4">
                {t('layout_print')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="screen">
                {t('layout_screen')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Primary Action: Export */}
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
              <span>{t('export')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{t('export_options')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleExport('pdf')}>
              <FileText className="mr-2 h-4 w-4" /> {t('export_pdf')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport('png')}>
              <FileImage className="mr-2 h-4 w-4" /> {t('export_png')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
