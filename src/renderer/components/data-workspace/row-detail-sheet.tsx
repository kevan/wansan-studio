import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { formatForDisplay } from '@shared/serialization'
import { Copy, ChevronUp, ChevronDown, Calendar, Hash, Type, Braces } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToastStore } from '@/stores/useToastStore'

interface RowDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: Record<string, any> | null
  columns: Array<{ name: string; type: string }>
  onNavigate?: (direction: 'prev' | 'next') => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function RowDetailSheet({
  open,
  onOpenChange,
  row,
  columns,
  onNavigate,
  hasPrev,
  hasNext,
}: RowDetailSheetProps) {
  const { t } = useTranslation('common')
  const addToast = useToastStore((s) => s.addToast)

  if (!row) return null

  // Group columns by type
  const groups = columns.reduce((acc, col) => {
    let type = 'text'
    const dbType = col.type.toUpperCase()
    if (['INT', 'BIGINT', 'DOUBLE', 'DECIMAL', 'FLOAT', 'NUMBER'].some(k => dbType.includes(k))) type = 'number'
    else if (['DATE', 'TIME', 'TIMESTAMP'].some(k => dbType.includes(k))) type = 'date'
    else if (['JSON', 'STRUCT', 'MAP', 'LIST'].some(k => dbType.includes(k))) type = 'json'
    
    if (!acc[type]) acc[type] = []
    acc[type].push(col)
    return acc
  }, {} as Record<string, typeof columns>)

  const handleCopy = (val: any) => {
    navigator.clipboard.writeText(String(val))
    addToast({
      title: t('copied'),
      type: 'success',
    })
  }

  const renderValue = (val: any, type: string) => {
    if (val === null || val === undefined) return <span className="text-zinc-300 italic">null</span>
    
    if (type === 'json') {
      try {
        const str = typeof val === 'string' ? val : JSON.stringify(val, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value, 2)
        return <pre className="text-xs bg-zinc-50 p-2 rounded border border-zinc-100 overflow-auto whitespace-pre-wrap">{str}</pre>
      } catch {
        return String(val)
      }
    }

    return <span className="text-zinc-900 break-words whitespace-pre-wrap">{formatForDisplay(val, type)}</span>
  }

  const renderGroup = (title: string, icon: any, cols: typeof columns) => {
    if (!cols || cols.length === 0) return null
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">
          {icon}
          {title}
        </div>
        <div className="grid gap-3">
          {cols.map((col) => (
            <div key={col.name} className="group relative bg-white border border-zinc-100 rounded-lg p-3 hover:border-indigo-100 hover:shadow-sm transition-all">
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-xs font-semibold text-zinc-500">{col.name}</span>
                <span className="text-[10px] font-mono text-zinc-300">{col.type}</span>
              </div>
              <div className="text-sm">
                {renderValue(row[col.name], col.type)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopy(row[col.name])}
              >
                <Copy className="h-3 w-3 text-zinc-400" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col bg-zinc-50/50">
        {open && (
          <>
            <div className="p-6 pb-2 border-b bg-white">
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <span className="truncate">Row Detail</span>
                  <Badge variant="outline" className="font-mono text-xs font-normal text-zinc-400">
                    #{String(row._ws_row_id) || 'N/A'}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {t('preview_data')}
                </SheetDescription>
              </SheetHeader>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {onNavigate && (
                    <>
                      <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => onNavigate('prev')}>
                        <ChevronUp className="h-4 w-4 mr-1" /> Prev
                      </Button>
                      <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => onNavigate('next')}>
                        Next <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6">
              {renderGroup('Identifiers & Text', <Type className="w-3.5 h-3.5" />, groups.text)}
              {renderGroup('Metrics & Numbers', <Hash className="w-3.5 h-3.5" />, groups.number)}
              {renderGroup('Timeline', <Calendar className="w-3.5 h-3.5" />, groups.date)}
              {renderGroup('Structures', <Braces className="w-3.5 h-3.5" />, groups.json)}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
