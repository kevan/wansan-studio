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

interface ReportTableProps {
  data: Array<Record<string, any>>
  columns: string[]
  variant: 'chat' | 'dashboard'
}

export function ReportTable({
  data = [],
  columns = [],
  variant,
}: ReportTableProps) {
  const { t } = useTranslation('common')
  const columnKeys =
    columns && columns.length > 0
      ? columns
      : data.length > 0
        ? Object.keys(data[0])
        : []
  const [sorting, setSorting] = React.useState<SortingState>([])
  const isDashboard = variant === 'dashboard'

  const columnDefs: ColumnDef<Record<string, any>>[] = columnKeys.map(key => ({
    accessorKey: key,
    header: key,
    cell: info => {
      const value = info.getValue()
      const display = formatForDisplay(value)
      return (
        <span className="truncate" title={display}>
          {display}
        </span>
      )
    },
  }))

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: isDashboard ? 10 : 5,
      },
    },
  })

  const rowModel = table.getRowModel()

  return (
    <div className="flex flex-col h-full w-full">
      <div
        className={cn(
          'flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white relative',
          isDashboard ? 'min-h-0' : 'shadow-sm'
        )}
      >
        <table className="w-full text-[13px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 shadow-sm">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-zinc-100">
                {headerGroup.headers.map(header => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'h-9 px-3 text-left font-bold text-zinc-600 uppercase tracking-wider border-r border-b border-zinc-300 last:border-r-0 whitespace-nowrap',
                        header.column.getCanSort()
                          ? 'cursor-pointer select-none hover:bg-zinc-200/80 transition-colors'
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
                            <span className="text-[10px] text-indigo-600">▲</span>
                          )}
                          {sorted === 'desc' && (
                            <span className="text-[10px] text-indigo-600">▼</span>
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
                    'group border-b border-zinc-100 transition-colors hover:bg-indigo-50/40',
                    i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'
                  )}
                >
                  {row.getVisibleCells().map(cell => {
                    const val = cell.getValue()
                    const isNum = typeof val === 'number' || typeof val === 'bigint'
                    
                    return (
                      <td 
                        key={cell.id} 
                        className={cn(
                          "px-3 py-1.5 border-r border-zinc-100 last:border-r-0 truncate max-w-[250px]",
                          isNum && "font-mono text-right text-indigo-600/90"
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
                  colSpan={columnKeys.length || 1}
                  className="px-4 py-12 text-center text-sm text-zinc-400 italic"
                >
                  {t('no_data')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isDashboard && (
        <div className="flex items-center justify-between gap-3 py-3 text-xs text-zinc-600">
          <div>
            {t('page_of', {
              page: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount() || 1,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {t('prev')}
            </button>
            <button
              className="px-2 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
