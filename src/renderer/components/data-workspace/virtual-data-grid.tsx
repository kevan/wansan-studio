/**
 * VirtualDataGrid - High-Performance Virtual Scrolling Grid
 * Based on: docs/SPEC_DATA_EXPLORER_V2.md
 * 
 * Key Features:
 * - Virtual scrolling with @tanstack/react-virtual
 * - Infinite loading with @tanstack/react-query
 * - System identity via _ws_row_id
 * - Master-Detail view with RowDetailSheet
 */
import React, { useRef, useState, useMemo, useCallback, memo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  Row,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown, RefreshCcw } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatForDisplay } from '@shared/serialization'
import { Button } from '@/components/ui/button'
import { RowDetailSheet } from './row-detail-sheet'
import { FilterBar } from './filter-bar'
import { ViewSwitcher } from './view-switcher'
import { FilterRule, filterRuleToSQL } from '@shared/types/filter'
import { TableView } from '@shared/types/project'

interface VirtualDataGridProps {
  fileId: string
  tableName: string
  columns: Array<{ name: string; type: string }>
  totalRows?: number
}

const PAGE_SIZE = 100
const ROW_HEIGHT = 35
const OVERSCAN = 5

// Memoized row component to prevent unnecessary re-renders
const GridRow = memo(function GridRow({
  row,
  isSelected,
  onClick,
}: {
  row: Row<Record<string, unknown>>
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors",
        isSelected && "bg-indigo-50 hover:bg-indigo-50/80"
      )}
      style={{ height: ROW_HEIGHT }}
      onClick={onClick}
    >
      {row.getVisibleCells().map((cell) => (
        <div
          key={cell.id}
          className="px-4 py-1.5 text-sm text-zinc-700 truncate border-r border-zinc-50/50 last:border-r-0 font-light"
          style={{ width: cell.column.getSize(), flexShrink: 0 }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      ))}
    </div>
  )
})

export function VirtualDataGrid({
  fileId,
  tableName,
  columns,
  totalRows,
}: VirtualDataGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [filters, setFilters] = useState<FilterRule[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  
  // Row Selection & Detail View
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null)

  // Handle View Select
  const handleViewSelect = useCallback((view: TableView | null) => {
    if (view) {
      setFilters(view.filters)
      setSorting(view.sort || [])
      setActiveViewId(view.id)
    } else {
      setFilters([])
      setSorting([])
      setActiveViewId(null)
    }
  }, [])
  const queryFn = useCallback(async ({ pageParam = 0 }: { pageParam?: number }) => {
    // 1. Build WHERE clause
    const enabledFilters = filters.filter(f => f.enabled)
    let whereClause = ''
    if (enabledFilters.length > 0) {
      const parts = enabledFilters.map(filterRuleToSQL).filter(p => p !== '')
      if (parts.length > 0) {
        whereClause = `WHERE ${parts.join(' AND ')}`
      }
    }

    // 2. Build ORDER BY clause
    let orderBy = ''
    if (sorting.length > 0) {
      const sort = sorting[0]
      orderBy = `ORDER BY "${sort.id}" ${sort.desc ? 'DESC' : 'ASC'}`
    } else {
      orderBy = `ORDER BY _ws_row_id ASC` 
    }

    const sql = `SELECT * FROM "${tableName}" ${whereClause} ${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${pageParam}`
    const res = await window.electronAPI.runSQL(sql)
    if (!res.success) throw new Error(res.error)
    return (res.data?.data || []) as Record<string, unknown>[]
  }, [tableName, sorting, filters])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['table-data', tableName, sorting, filters],
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined
      return allPages.length * PAGE_SIZE
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds cache
  })

  // Flatten data - memoized to prevent recalculation
  const flatData = useMemo(() => {
    return data?.pages.flat() ?? []
  }, [data?.pages])

  // Column definitions - memoized
  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return columns
      .filter(c => c.name !== '_ws_row_id')
      .map(col => ({
        accessorKey: col.name,
        header: col.name,
        size: 150,
        cell: info => {
          const val = info.getValue()
          const display = formatForDisplay(val, col.type)
          return (
            <div className="truncate" title={String(display)}>
              {display}
            </div>
          )
        }
      }))
  }, [columns])

  // React Table instance
  const table = useReactTable({
    data: flatData,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    getRowId: (row) => String(row._ws_row_id ?? ''),
  })

  const { rows } = table.getRowModel()

  // Virtualizer with stable config
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: useCallback(() => parentRef.current, []),
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: OVERSCAN,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  // Scroll-based infinite loading - using IntersectionObserver pattern
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  // Use IntersectionObserver for smooth infinite scroll
  React.useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Handle Row Click - memoized
  const handleRowClick = useCallback((rowData: Record<string, unknown>) => {
    setSelectedRowId(String(rowData._ws_row_id))
    setDetailRow(rowData)
    setIsDetailOpen(true)
  }, [])

  // Handle Navigation in Detail Sheet
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedRowId || flatData.length === 0) return
    const idx = flatData.findIndex((r) => String(r._ws_row_id) === selectedRowId)
    if (idx === -1) return

    const newIdx = direction === 'next' ? idx + 1 : idx - 1
    if (newIdx >= 0 && newIdx < flatData.length) {
      const nextRow = flatData[newIdx]
      setSelectedRowId(String(nextRow._ws_row_id))
      setDetailRow(nextRow)
    } else if (direction === 'next' && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [selectedRowId, flatData, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Memoized navigation state
  const navState = useMemo(() => {
    const idx = flatData.findIndex((r) => String(r._ws_row_id) === selectedRowId)
    return {
      hasPrev: idx > 0,
      hasNext: idx < flatData.length - 1 || !!hasNextPage
    }
  }, [flatData, selectedRowId, hasNextPage])

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading data...
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4">
        <p>Error loading data: {(error as Error).message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCcw className="w-4 h-4 mr-2"/> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col w-full bg-white relative">
      {/* Detail Sheet */}
      <RowDetailSheet 
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        row={detailRow}
        columns={columns}
        onNavigate={handleNavigate}
        hasPrev={navState.hasPrev}
        hasNext={navState.hasNext}
      />

      {/* Filter Bar */}
      <FilterBar 
        columns={columns}
        filters={filters}
        onChange={setFilters}
        rightSide={
          <ViewSwitcher 
            fileId={fileId}
            currentFilters={filters}
            currentSort={sorting as { id: string; desc: boolean }[]}
            onViewSelect={handleViewSelect}
            activeViewId={activeViewId}
          />
        }
      />

      {/* Grid Header - Fixed */}
      <div className="flex border-b border-zinc-200 bg-zinc-50/80 backdrop-blur z-10 shadow-sm flex-shrink-0">
        {table.getHeaderGroups().map(headerGroup => (
          <div key={headerGroup.id} className="flex">
            {headerGroup.headers.map(header => {
              const isSorted = header.column.getIsSorted()
              return (
                <div
                  key={header.id}
                  className={cn(
                    "h-10 px-4 py-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500 border-r border-zinc-200/50 last:border-r-0 cursor-pointer hover:bg-zinc-100 transition-colors select-none whitespace-nowrap",
                    isSorted && "text-indigo-600 bg-indigo-50/50"
                  )}
                  style={{ width: header.getSize(), flexShrink: 0 }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="truncate flex-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                  <div className="w-4">
                    {{
                      asc: <ArrowUp className="w-3 h-3" />,
                      desc: <ArrowDown className="w-3 h-3" />,
                    }[header.column.getIsSorted() as string] ?? (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Virtual Scroll Area */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-auto w-full"
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index]
            if (!row) return null

            return (
              <div
                key={row.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <GridRow
                  row={row}
                  isSelected={row.id === selectedRowId}
                  onClick={() => handleRowClick(row.original)}
                />
              </div>
            )
          })}
        </div>

        {/* Infinite scroll trigger element */}
        <div 
          ref={loadMoreRef} 
          className="h-12 flex items-center justify-center"
        >
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading more...
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Status */}
      <div className="h-8 border-t border-zinc-100 bg-white flex items-center px-4 justify-between text-[10px] text-zinc-400 flex-shrink-0">
        <span>
          {flatData.length} loaded
          {totalRows ? ` / ~${totalRows.toLocaleString()} total` : ''}
          {!hasNextPage && flatData.length > 0 && ' (all loaded)'}
        </span>
        {isFetchingNextPage && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
      </div>
    </div>
  )
}
