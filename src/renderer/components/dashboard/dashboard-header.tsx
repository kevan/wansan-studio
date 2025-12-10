import {
  Download,
  ChevronDown,
  FileCode,
  FileImage,
  FileText,
  Monitor,
  Printer,
  ZoomIn,
  ZoomOut,
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
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

export function DashboardHeader() {
  const { canvasConfig, setCanvasConfig, setLayoutScenario } =
    useWorkbenchStore()
  const layoutScenario = useWorkbenchStore(state => state.layoutScenario)

  const updateConfig = (key: keyof typeof canvasConfig, value: unknown) => {
    setCanvasConfig({ [key]: value } as Partial<typeof canvasConfig>)
  }

  const handleLayoutChange = (value: CanvasLayout) => {
    updateConfig('layout', value)
    setLayoutScenario(value === 'a4' ? 'print' : 'default')
  }

  const handleExport = async (type: 'pdf' | 'html' | 'png') => {
    const { layout, title } = canvasConfig
    if (type === 'png') {
      const node = document.getElementById('report-canvas-paper')
      if (!node) {
        console.warn('report-canvas-paper not found for export')
        return
      }
      try {
        const dataUrl = await toPng(node, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          filter: el =>
            !el.classList?.contains('card-controls') &&
            !el.classList?.contains('hide-on-export'),
        })
        const fileName = `${canvasConfig.title || 'Report'}.png`
        await window.electronAPI?.saveImage(dataUrl, fileName)
      } catch (err) {
        console.error('Image export failed', err)
      }
      return
    }

    if (window.electronAPI?.exportReport) {
      if (type === 'pdf') {
        const node = document.getElementById('report-canvas-paper')
        if (!node) {
          console.warn('report-canvas-paper not found for PDF export')
          return
        }

      try {
        const dataUrl = await toPng(node, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          filter: el =>
            !el.classList?.contains('card-controls') &&
            !el.classList?.contains('hide-on-export'),
        })

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
            format: 'a4',
          })

          const imgProps = pdf.getImageProperties(dataUrl)
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

          pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
          const fileName = `${canvasConfig.title || 'Report'}.pdf`
          pdf.save(fileName)
        } catch (err) {
          console.error('PDF export failed', err)
        }
        return
      }

      window.electronAPI.exportReport({
        type,
        title,
        layoutOptions: {
          isA4: layout === 'a4',
          landscape: false,
        },
      })
    } else {
      console.warn('exportReport not available in this environment')
    }
  }

  return (
    <div className="h-14 flex items-center justify-between px-6 border-b bg-white/80 backdrop-blur-sm z-10 sticky top-0">
      {/* LEFT: Editable Title */}
      <div className="flex items-center gap-2 flex-1">
        <Input
          value={canvasConfig.title}
          onChange={e => updateConfig('title', e.target.value)}
          className="max-w-[300px] border-transparent hover:border-input bg-transparent text-lg font-semibold h-9 px-2 focus-visible:ring-0"
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
          <span className="text-xs w-10 text-center font-medium tabular-nums text-zinc-600">
            {canvasConfig.zoom}%
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
                {canvasConfig.layout === 'a4' ? 'Print (A4)' : 'Screen (16:9)'}
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
                Print Layout (A4)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="screen">
                Screen Layout (Fluid)
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
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Export Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleExport('pdf')}>
              <FileText className="mr-2 h-4 w-4" /> PDF Document
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport('html')}>
              <FileCode className="mr-2 h-4 w-4" /> HTML Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport('png')}>
              <FileImage className="mr-2 h-4 w-4" /> Image (PNG)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
