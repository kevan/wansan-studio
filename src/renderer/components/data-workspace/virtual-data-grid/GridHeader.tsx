import React from 'react'
import { Header } from '@tanstack/react-table'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit3,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/utils/cn'
import { getTypeIcon, getSourceIndicator } from './utils'
import { ColumnSchema } from '@shared/types'

interface GridHeaderProps {
  header: Header<Record<string, unknown>, unknown>
  columns: ColumnSchema[]
  onModifyStructure?: () => void
  onHideColumn: (id: string) => void
}

export function GridHeader({
  header,
  columns,
  onModifyStructure,
  onHideColumn,
}: GridHeaderProps) {
  const isSorted = header.column.getIsSorted()
  const meta = header.column.columnDef.meta as { type?: string; sourceType?: string }
  const typeIcon = getTypeIcon(meta?.type || 'VARCHAR')
  const indicator = getSourceIndicator(meta?.sourceType)

  const originalColumn = columns.find(c => c.name === header.id)
  const alias = originalColumn?.semantic?.aliases?.[0]
  const displayName = alias ? `${alias} (${header.id})` : header.id

  return (
    <ContextMenu key={header.id}>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'h-10 px-4 py-2 flex items-center gap-2 text-xs font-medium text-zinc-500 border-r border-zinc-200/50 last:border-r-0 cursor-pointer hover:bg-zinc-100 transition-colors select-none whitespace-nowrap group/header',
            isSorted && 'text-indigo-600 bg-indigo-50/50',
            indicator?.bg && 'bg-opacity-30 border-b-2',
            indicator?.bg && (meta?.sourceType === 'ai' ? 'border-b-purple-400' : meta?.sourceType === 'metric' ? 'border-b-green-400' : 'border-b-orange-400')
          )}
          style={{ width: header.getSize(), flexShrink: 0 }}
          onClick={header.column.getToggleSortingHandler()}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-zinc-300 group-hover/header:text-indigo-400 transition-colors">{typeIcon}</span>
            <span className="truncate" title={displayName}>{displayName}</span>
            {indicator && <span className={cn('ml-auto', indicator.color)}>{indicator.icon}</span>}
          </div>
          <div className="w-4 flex items-center justify-center">
            {isSorted ? (isSorted === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : (<ArrowUpDown className="w-3 h-3 opacity-0 group-hover/header:opacity-30" />)}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          className="gap-2"
          onClick={onModifyStructure}
        >
          <Edit3 className="w-3.5 h-3.5" /> Modify Structure...
        </ContextMenuItem>
        <ContextMenuItem
          className="gap-2 text-red-600 focus:text-red-600"
          onClick={() => onHideColumn(header.id)}
        >
          <EyeOff className="w-3.5 h-3.5" /> Hide Column
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="gap-2" disabled><Sparkles className="w-3.5 h-3.5" /> AI Analysis...</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
