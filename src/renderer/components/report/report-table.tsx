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

// 格式化时间戳的辅助函数
  const formatTimestamp = (value: any): string => {
    if (typeof value === 'number') {
      // 检查是否在合理的时间戳范围内（2000-2030年）
      const minTimestamp = 946684800000 // 2000-01-01
      const maxTimestamp = 1893456000000 // 2030-01-01

      if (value >= minTimestamp && value <= maxTimestamp) {
        try {
          return new Date(value).toLocaleString()
        } catch {
          return String(value)
        }
      }
    }

    // 如果是字符串类型的时间，也尝试格式化
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      try {
        return new Date(value).toLocaleString()
      } catch {
        return value
      }
    }

    // 其他情况保持原样
    return value === null || value === undefined ? '—' : String(value)
  }

  const columnDefs: ColumnDef<Record<string, any>>[] = columnKeys.map(key => ({
    accessorKey: key,
    header: key,
    cell: info => {
      const value = info.getValue()
      const display = formatTimestamp(value)
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
          'flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white',
          isDashboard ? 'min-h-0' : 'shadow-sm'
        )}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-700">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-zinc-200">
                {headerGroup.headers.map(header => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-2 text-left font-semibold whitespace-nowrap',
                        header.column.getCanSort()
                          ? 'cursor-pointer select-none hover:bg-zinc-100'
                          : ''
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {sorted === 'asc' && (
                          <span className="text-[10px]">▲</span>
                        )}
                        {sorted === 'desc' && (
                          <span className="text-[10px]">▼</span>
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
              rowModel.rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 hover:bg-zinc-50"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2 max-w-xs">
                      <div className="truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columnKeys.length || 1}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
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
