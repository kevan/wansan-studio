import React from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/utils/cn.ts'
import { useTranslation } from 'react-i18next'
import { formatForDisplay } from '@shared/serialization'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'

interface ReportTableProps {
  data: Array<Record<string, any>>
  columnFields?: Array<{ name: string; type: string }>
  columns?: string[] // Legacy support
  columnTypes?: Record<string, string> // Legacy support
  variant: 'chat' | 'dashboard' | 'preview' | 'fullscreen'
}

export function ReportTable({
  data = [],
  columnFields = [],
  columns = [],
  columnTypes = {},
  variant,
}: ReportTableProps) {
  const { t } = useTranslation('common')
  const safeData = data || []

  // Runtime compatibility: Reconstruct columnFields if missing
  const effectiveColumnFields = React.useMemo(() => {
    if (columnFields && columnFields.length > 0) return columnFields
    if (columns && columns.length > 0) {
      return columns.map(name => ({
        name,
        type: columnTypes[name] || 'VARCHAR',
      }))
    }
    // Final fallback: use keys from data
    if (safeData.length > 0) {
      return Object.keys(safeData[0]).map(name => ({
        name,
        type: 'VARCHAR' as const,
      }))
    }
    return []
  }, [columnFields, columns, columnTypes, safeData])

  const [sorting, setSorting] = React.useState<SortingState>([])

  const isCard = variant === 'chat' || variant === 'dashboard'
  const isModal = variant === 'preview' || variant === 'fullscreen'

  const columnDefs: ColumnDef<Record<string, any>>[] = effectiveColumnFields.map(
    field => ({
      accessorKey: field.name,
      header: field.name,
      cell: info => {
        const value = info.getValue()
        const display = formatForDisplay(value, field.type)
        return (
          <span className="truncate" title={display}>
            {display}
          </span>
        )
      },
    })
  )

  const table = useReactTable({
    data: safeData,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: isModal ? 10 : 5,
      },
    },
  })

  const rowModel = table.getRowModel()

  return (
    <div className="flex flex-col h-full w-full">
      <div
        className={cn(
          'flex-1 overflow-auto relative transition-all',
          isCard
            ? 'border-0 bg-transparent'
            : 'rounded-lg border border-zinc-200 bg-white shadow-sm'
        )}
      >
        <table className="w-full text-[13px] border-separate border-spacing-0">
          <thead
            className={cn(
              'sticky top-0 z-20',
              isCard ? 'bg-white/95 backdrop-blur-sm' : 'bg-zinc-100 shadow-sm'
            )}
          >
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'h-9 px-3 text-left transition-colors whitespace-nowrap',
                        isCard
                          ? 'text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100'
                          : 'font-bold text-zinc-600 uppercase tracking-wider border-r border-b border-zinc-300 last:border-r-0',
                        header.column.getCanSort()
                          ? 'cursor-pointer select-none hover:bg-zinc-50'
                          : ''
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <div className="w-3">
                          {sorted === 'asc' && (
                            <span className="text-[10px] text-indigo-600">
                              ▲
                            </span>
                          )}
                          {sorted === 'desc' && (
                            <span className="text-[10px] text-indigo-600">
                              ▼
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="text-zinc-700">
            {rowModel.rows.length ? (
              rowModel.rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'group transition-colors',
                    isCard
                      ? 'border-b border-zinc-50 hover:bg-zinc-50/50'
                      : i % 2 === 0
                        ? 'bg-white hover:bg-indigo-50/40'
                        : 'bg-zinc-50/50 hover:bg-indigo-50/40',
                    !isCard && 'border-b border-zinc-100'
                  )}
                >
                  {row.getVisibleCells().map(cell => {
                    const val = cell.getValue()
                    const isNum =
                      typeof val === 'number' || typeof val === 'bigint'

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-3 py-1.5 truncate max-w-[250px]',
                          !isCard && 'border-r border-zinc-100 last:border-r-0',
                          isNum && 'font-mono text-right text-indigo-600/90'
                        )}
                        title={String(val)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={effectiveColumnFields.length || 1}
                  className="px-4 py-12 text-center text-sm text-zinc-400 italic"
                >
                  {t('no_data')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 py-2 px-1 border-t border-zinc-100 bg-white/50 shrink-0">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            {t('page_of', {
              page: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount(),
            })}
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-zinc-100 rounded-md"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5 text-zinc-500" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-zinc-100 rounded-md"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
