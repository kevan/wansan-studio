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
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useToastStore } from '@/stores/useToastStore'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { PAGE_GAP_PX, PAGE_HEIGHT_PX } from '@/components/dashboard-v3/page-layer'
import { useTranslation } from 'react-i18next'
import { Analytics } from '../../services/analytics'

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
        });
        return;
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
        backgroundColor: '#f4f4f5',
        filter: el =>
          !el.classList?.contains('card-controls') &&
          !el.classList?.contains('hide-on-export'),
      })

      const fileName = `${canvasConfig.title || 'Report'}.${type === 'png' ? 'png' : 'pdf'}`

      if (type === 'png') {
        Analytics.track('export_clicked', { format: 'png' });
        await window.electronAPI?.saveImage(dataUrl, fileName)
        return
      }

      if (type === 'pdf') {
        Analytics.track('export_clicked', { format: 'pdf' });
      }

      const img = new Image()
      const imageLoad = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = err => reject(err)
      })
      img.src = dataUrl
      await imageLoad

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const ratio = img.width / (node.offsetWidth || 1)
      const sliceHeight = PAGE_HEIGHT_PX * ratio
      const gapHeight = PAGE_GAP_PX * ratio

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = sliceHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2d context for slicing')
      }

      for (let i = 0; i < pageCount; i++) {
        if (i > 0) pdf.addPage()
        const srcY = i * (sliceHeight + gapHeight)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, srcY, img.width, sliceHeight, 0, 0, canvas.width, canvas.height)
        const sliceData = canvas.toDataURL('image/png')
        pdf.addImage(sliceData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      pdf.save(fileName)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setCanvasConfig({ zoom: originalZoom })
    }
  }

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b bg-white/80 backdrop-blur-sm z-10 sticky top-0">
      {/* LEFT: Editable Title */}
      <div className="flex items-center gap-2 flex-1">
        <Input
          value={canvasConfig.title}
          onChange={e => updateConfig('title', e.target.value)}
          className="max-w-[300px] border-transparent hover:border-input bg-transparent text-sm font-semibold h-8 px-2 focus-visible:ring-0"
          placeholder={t('edit_schema')}
        />
      </div>

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
            {canvasConfig.zoom}{isA4 ? '' : '%'}
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
                {canvasConfig.layout === 'a4' ? t('layout_print') : t('layout_screen')}
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
              {!isActivated ? <Lock className="h-3.5 w-3.5 text-yellow-400" /> : <Download className="h-3.5 w-3.5" />}
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
