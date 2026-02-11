import React, { memo, useCallback } from 'react'
import { flexRender, Row } from '@tanstack/react-table'
import { cn } from '@/utils/cn'
import { formatForDisplay } from '@shared/serialization'
import { ROW_HEIGHT, getSourceIndicator } from './utils'

interface GridRowProps {
  row: Row<Record<string, unknown>>
  rowId: string
  isSelected: boolean
  onSelect: (rowId: string) => void
  onOpen: (rowId: string) => void
}

export const GridRow = memo(function GridRow({
  row,
  rowId,
  isSelected,
  onSelect,
  onOpen,
}: GridRowProps) {
  const handleClick = useCallback(() => {
    onSelect(rowId)
  }, [onSelect, rowId])

  const handleDoubleClick = useCallback(() => {
    onOpen(rowId)
  }, [onOpen, rowId])

  return (
    <div
      className={cn(
        'flex items-center border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors',
        isSelected && 'bg-indigo-50 hover:bg-indigo-50/80'
      )}
      style={{ height: ROW_HEIGHT }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {row.getVisibleCells().map((cell) => {
        const sourceType = (cell.column.columnDef.meta as { sourceType?: string })?.sourceType
        const indicator = getSourceIndicator(sourceType)

        return (
          <div
            key={cell.id}
            className={cn(
              'px-4 py-1.5 text-sm text-zinc-700 truncate border-r border-zinc-50/50 last:border-r-0 font-light h-full flex items-center',
              indicator?.bg && 'bg-opacity-20',
              indicator?.bg
            )}
            style={{ width: cell.column.getSize(), flexShrink: 0 }}
          >
            <span className="truncate" title={String(formatForDisplay(cell.getValue(), (cell.column.columnDef.meta as { type?: string })?.type || 'VARCHAR'))}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          </div>
        )
      })}
    </div>
  )
})
