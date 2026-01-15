import React from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { formatForDisplay } from '@shared/serialization'
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { Button } from '../../ui/button'

interface ReportTableProps {
  data: Array<Record<string, any>>
  columnFields?: Array<{ name: string; type: string }>
  columns?: string[] // Legacy support
  columnTypes?: Record<string, string> // Legacy support
  variant: 'chat' | 'dashboard' | 'preview' | 'fullscreen' | 'report'
  highlightedItems?: string[]
}

export function DataTable({
  data,
  columnFields = [],
  columns = [],
  columnTypes = {},
  variant = 'chat',
  highlightedItems = [],
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

  const isCard = variant === 'chat' || variant === 'dashboard' || variant === 'report'
  const isModal = variant === 'preview' || variant === 'fullscreen'

  const columnDefs: ColumnDef<Record<string, any>>[] =
    effectiveColumnFields.map(field => ({
      accessorKey: field.name,
      header: field.name,
      cell: info => {
        const value = info.getValue()
        const display = formatForDisplay(value, field.type)
        return (
          <span className="truncate block min-w-[100px]" title={display}>
            {display}
          </span>
        )
      },
    }))

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
        pageSize: 10,
      },
    },
  })

  const rowModel = table.getRowModel()

  return (
    <div className={cn(
      'flex flex-col w-full max-w-full min-w-0',
      (variant === 'dashboard' || isModal) ? 'h-full' : 'h-auto'
    )}>
      <div
        className={cn(
          'relative transition-all w-full',
          (variant === 'dashboard' || isModal) ? 'flex-1 overflow-x-auto overflow-y-auto' : 'overflow-x-auto overflow-y-hidden',
          isCard
            ? 'border-0 bg-transparent'
            : 'rounded-lg border border-zinc-200 bg-white shadow-sm'
        )}
      >
        <table className="min-w-full text-[13px] border-separate border-spacing-0 table-auto">
          <thead
            className={cn(
              'sticky top-0 z-20 transition-all',
              isCard ? 'bg-white/80 backdrop-blur-md' : 'bg-zinc-50/90 backdrop-blur-md shadow-sm'
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
                        'h-10 px-4 text-left transition-all whitespace-nowrap group/th relative min-w-[120px]',
                        isCard
                          ? 'text-[11px] font-bold text-zinc-600 uppercase tracking-wider border-b border-zinc-100 bg-transparent'
                          : 'font-bold text-zinc-700 tracking-wide border-r border-b border-zinc-200 last:border-r-0 bg-transparent',
                        header.column.getCanSort()
                          ? 'cursor-pointer select-none hover:bg-zinc-50/50'
                          : '',
                        sorted && 'text-indigo-600 bg-indigo-50/20'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5 py-1">
                        <span className={cn(
                          "transition-colors",
                          sorted ? "text-indigo-600" : "group-hover/th:text-zinc-800"
                        )}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>

                        {header.column.getCanSort() && (
                          <div className={cn(
                            "flex items-center justify-center transition-all duration-200",
                            sorted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 group-hover/th:opacity-40 group-hover/th:translate-y-0"
                          )}>
                            {sorted === 'asc' && <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />}
                            {sorted === 'desc' && <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />}
                            {!sorted && <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />}
                          </div>
                        )}

                        {sorted && (
                          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-500 animate-in fade-in slide-in-from-bottom-1" />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="text-zinc-700">
            {rowModel.rows.length ? (
              rowModel.rows.map((row, i) => {
                const rowValues = Object.values(row.original).map(v => String(v))
                const isHighlighted = highlightedItems.some(item => rowValues.includes(item))
                const isAnchoringActive = highlightedItems.length > 0

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'group transition-all duration-300',
                      isCard
                        ? 'border-b border-zinc-50 hover:bg-zinc-50/50'
                        : i % 2 === 0
                          ? 'bg-white hover:bg-indigo-50/40'
                          : 'bg-zinc-50/50 hover:bg-indigo-50/40',
                      !isCard && 'border-b border-zinc-100',
                      isHighlighted ? 'bg-indigo-50/60 shadow-[inset_4px_0_0_0_#6366f1]' : (isAnchoringActive && 'opacity-40 grayscale-[0.5]')
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
                          'px-4 py-2 truncate max-w-[250px]',
                          !isCard && 'border-r border-zinc-100 last:border-r-0',
                          isNum && 'font-mono text-right text-indigo-600/90 tracking-tight'
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
                )
              })
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
