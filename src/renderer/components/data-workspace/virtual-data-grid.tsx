/**
 * VirtualDataGrid - High-Performance Virtual Scrolling Grid
 * Based on: docs/SPEC_DATA_EXPLORER_V4_GRIP.md
 * 
 * Key Features:
 * - Pure SELECT / Explorer experience
 * - Virtual scrolling with @tanstack/react-virtual
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
import {
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCcw,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Sparkles,
  Link,
  ChevronRight,
  Edit3,
  EyeOff,
  LayoutPanelTop,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatForDisplay } from '@shared/serialization'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { RowDetailSheet } from './row-detail-sheet'
import { FilterBar } from './filter-bar'
import { ViewSwitcher } from './view-switcher'
import { FieldListSidebar } from './field-list-sidebar'
import { FilterRule, filterRuleToSQL } from '@shared/types/filter'
import { TableView } from '@shared/types/project'
import { useProjectStore } from '@/stores/useProjectStore'
import { ColumnSchema } from '@shared/types'

interface VirtualDataGridProps {
  fileId: string
  tableName: string
  columns: Array<ColumnSchema>
  totalRows?: number
  onModifyStructure?: () => void
}

const PAGE_SIZE = 100
const ROW_HEIGHT = 35
const OVERSCAN = 5

/** Helper to get icon for column type */
function getTypeIcon(type: string) {
  const t = type.toUpperCase()
  if (['INT', 'BIGINT', 'DOUBLE', 'DECIMAL', 'FLOAT', 'NUMBER', 'REAL', 'INTEGER'].some(k => t.includes(k))) return <Hash className="w-3 h-3" />
  if (['DATE', 'TIME', 'TIMESTAMP'].some(k => t.includes(k))) return <Calendar className="w-3 h-3" />
  if (['BOOLEAN'].includes(t)) return <ToggleLeft className="w-3 h-3" />
  return <Type className="w-3 h-3" />
}

/** Helper to get icon/color for source type */
function getSourceIndicator(sourceType?: string) {
  switch (sourceType) {
    case 'ai':
      return { icon: <Sparkles className="w-3 h-3" />, color: 'text-purple-500', bg: 'bg-purple-50' }
    case 'metric':
      return { icon: <ChevronRight className="w-3 h-3" />, color: 'text-green-500', bg: 'bg-green-50' }
    case 'joined':
      return { icon: <Link className="w-3 h-3" />, color: 'text-orange-500', bg: 'bg-orange-50' }
    default:
      return null
  }
}

// Memoized row component
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
      {row.getVisibleCells().map((cell) => {
        const sourceType = (cell.column.columnDef.meta as any)?.sourceType
        const indicator = getSourceIndicator(sourceType)

        return (
          <div
            key={cell.id}
            className={cn(
              "px-4 py-1.5 text-sm text-zinc-700 truncate border-r border-zinc-50/50 last:border-r-0 font-light h-full flex items-center",
              indicator?.bg && "bg-opacity-20",
              indicator?.bg
            )}
            style={{ width: cell.column.getSize(), flexShrink: 0 }}
          >
            <span className="truncate" title={String(formatForDisplay(cell.getValue(), (cell.column.columnDef.meta as any)?.type || 'VARCHAR'))}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          </div>
        )
      })}
    </div>
  )
})

export function VirtualDataGrid({
  fileId,
  tableName,
  columns,
  totalRows,
  onModifyStructure,
}: VirtualDataGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [filters, setFilters] = useState<FilterRule[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { files } = useProjectStore()
  const file = files.find(f => f.id === fileId)
  
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
      
      // Apply column config
      if (view.columnConfig?.hidden) {
        const visibility: Record<string, boolean> = {}
        view.columnConfig.hidden.forEach(col => visibility[col] = false)
        setColumnVisibility(visibility)
      } else {
        setColumnVisibility({})
      }
    } else {
      setFilters([])
      setSorting([])
      setActiveViewId(null)
      setColumnVisibility({})
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
    staleTime: 30000,
  })

  const flatData = useMemo(() => data?.pages.flat() ?? [], [data?.pages])

  // Column definitions
  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return columns
      .filter(c => c.name !== '_ws_row_id')
      .map(col => ({
        accessorKey: col.name,
        header: col.name,
        size: 150,
        meta: {
          type: col.type,
          sourceType: col.sourceType,
        },
        cell: info => formatForDisplay(info.getValue(), col.type)
      }))
  }, [columns])

  const table = useReactTable({
    data: flatData,
    columns: tableColumns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    getRowId: (row) => String(row._ws_row_id ?? ''),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: useCallback(() => parentRef.current, []),
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: OVERSCAN,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { threshold: 0.1, rootMargin: '200px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleRowClick = useCallback((rowData: Record<string, unknown>) => {
    setSelectedRowId(String(rowData._ws_row_id))
    setDetailRow(rowData)
    setIsDetailOpen(true)
  }, [])

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

  const navState = useMemo(() => {
    const idx = flatData.findIndex((r) => String(r._ws_row_id) === selectedRowId)
    return {
      hasPrev: idx > 0,
      hasNext: idx < flatData.length - 1 || !!hasNextPage
    }
  }, [flatData, selectedRowId, hasNextPage])

  const handleHideColumn = (colName: string) => {
    setColumnVisibility(prev => ({ ...prev, [colName]: false }))
  }

  if (isLoading) return <div className="h-full flex items-center justify-center text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading data...</div>
  if (isError) return <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4"><p>Error: {(error as Error).message}</p><Button variant="outline" onClick={() => refetch()}><RefreshCcw className="w-4 h-4 mr-2"/> Retry</Button></div>

  const currentColumnConfig = {
    hidden: Object.entries(columnVisibility).filter(([_, v]) => !v).map(([k]) => k)
  }

  return (
    <div className="h-full flex flex-col w-full bg-white relative">
      <RowDetailSheet open={isDetailOpen} onOpenChange={setIsDetailOpen} row={detailRow} columns={columns} onNavigate={handleNavigate} hasPrev={navState.hasPrev} hasNext={navState.hasNext} />
      
      <FilterBar 
        columns={columns} 
        filters={filters} 
        onChange={setFilters} 
        rightSide={
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("h-7 text-xs gap-1.5 px-2", isSidebarOpen && "bg-indigo-50 text-indigo-600")}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <LayoutPanelTop className="w-3.5 h-3.5" />
              Fields
            </Button>
            <div className="w-px h-4 bg-zinc-200 mx-1" />
            <ViewSwitcher fileId={fileId} currentFilters={filters} currentSort={sorting as any} currentColumnConfig={currentColumnConfig} onViewSelect={handleViewSelect} activeViewId={activeViewId} />
          </div>
        } 
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0">
          <div 
            ref={parentRef} 
            className="flex-1 overflow-auto w-full"
          >
            {/* 
              Shared Scroll Content: Header and Body live in the same scrollable container
              to achieve zero-lag horizontal scrolling via CSS sticky.
            */}
            <div className="min-w-max min-h-full flex flex-col">
              {/* Grid Header - Sticky */}
              <div className="sticky top-0 z-20 flex bg-zinc-50/95 backdrop-blur shadow-sm border-b border-zinc-200">
                {table.getHeaderGroups().map(headerGroup => (
                  <div key={headerGroup.id} className="flex">
                    {headerGroup.headers.map(header => {
                      const isSorted = header.column.getIsSorted()
                      const meta = header.column.columnDef.meta as any
                      const typeIcon = getTypeIcon(meta?.type || 'VARCHAR')
                      const indicator = getSourceIndicator(meta?.sourceType)
                      
                      // [V4.0] Get Display Name (Alias or Name)
                      const originalColumn = columns.find(c => c.name === header.id)
                      const alias = originalColumn?.semantic?.aliases?.[0]
                      const displayName = alias ? `${alias} (${header.id})` : header.id

                      return (
                        <ContextMenu key={header.id}>
                          <ContextMenuTrigger asChild>
                            <div
                              className={cn(
                                "h-10 px-4 py-2 flex items-center gap-2 text-xs font-medium text-zinc-500 border-r border-zinc-200/50 last:border-r-0 cursor-pointer hover:bg-zinc-100 transition-colors select-none whitespace-nowrap group/header",
                                isSorted && "text-indigo-600 bg-indigo-50/50",
                                indicator?.bg && "bg-opacity-30 border-b-2",
                                indicator?.bg && (meta.sourceType === 'ai' ? 'border-b-purple-400' : meta.sourceType === 'metric' ? 'border-b-green-400' : 'border-b-orange-400')
                              )}
                              style={{ width: header.getSize(), flexShrink: 0 }}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-zinc-300 group-hover/header:text-indigo-400 transition-colors">{typeIcon}</span>
                                <span className="truncate" title={displayName}>{displayName}</span>
                                {indicator && <span className={cn("ml-auto", indicator.color)}>{indicator.icon}</span>}
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
                              onClick={() => handleHideColumn(header.id)}
                            >
                              <EyeOff className="w-3.5 h-3.5" /> Hide Column
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="gap-2" disabled><Sparkles className="w-3.5 h-3.5" /> AI Analysis...</ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Grid Body - Virtualized */}
              <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
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
                        transform: `translateY(${virtualRow.start}px)` 
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
              
              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="h-12 flex items-center justify-center">
                {isFetchingNextPage && <div className="flex items-center gap-2 text-zinc-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading more...</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Field List Sidebar */}
        {isSidebarOpen && file && (
          <FieldListSidebar 
            file={file} 
            columnVisibility={columnVisibility} 
            onVisibilityChange={setColumnVisibility} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        )}
      </div>
      
      <div className="h-8 border-t border-zinc-100 bg-white flex items-center px-4 justify-between text-[10px] text-zinc-400 flex-shrink-0">
        <span>{flatData.length} loaded{totalRows ? ` / ~${totalRows.toLocaleString()} total` : ''}{!hasNextPage && flatData.length > 0 && ' (all loaded)'}</span>
        {isFetchingNextPage && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
      </div>
    </div>
  )
}
