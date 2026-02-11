import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2, RefreshCcw } from 'lucide-react'
import { formatForDisplay } from '@shared/serialization'
import { Button } from '@/components/ui/button'
import { RowDetailSheet } from '../row-detail-sheet'
import { FieldListSidebar } from '../field-list-sidebar'
import { useProjectStore } from '@/stores/useProjectStore'
import { ColumnSchema } from '@shared/types'
import { FilterState } from '@shared/types/filter'

import { ROW_HEIGHT, OVERSCAN } from './utils'
import { useGridData } from './useGridData'
import { useViewManager } from './useViewManager'
import { GridToolbar } from './GridToolbar'
import { ActiveFiltersList } from './ActiveFiltersList'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
import { ViewRepairDialog } from './ViewRepairDialog'
import { GridRow } from './GridRow'
import { GridHeader } from './GridHeader'

interface VirtualDataGridProps {
  fileId: string
  tableName: string
  columns: Array<ColumnSchema>
  totalRows?: number
  onModifyStructure?: () => void
}

export function VirtualDataGrid({
  fileId,
  tableName,
  columns,
  totalRows,
  onModifyStructure,
}: VirtualDataGridProps) {
  const isGridDebug = import.meta.env.DEV
  const logGrid = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (!isGridDebug) return
    const ts = new Date().toISOString()
    if (payload) {
      console.debug(`[VirtualDataGrid][${ts}] ${event}`, payload)
      return
    }
    console.debug(`[VirtualDataGrid][${ts}] ${event}`)
  }, [isGridDebug])

  const parentRef = useRef<HTMLDivElement>(null)
  const { files } = useProjectStore()
  const file = files.find(f => f.id === fileId)

  const [sorting, setSorting] = useState<SortingState>([])
  const [filterState, setFilterState] = useState<FilterState>({ conjunction: 'AND', conditions: [] })
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null)

  const availableColumns = useMemo(
    () => columns.filter(c => c.name !== '_ws_row_id'),
    [columns]
  )

  const defaultColumnOrder = useMemo(
    () => availableColumns.map(c => c.name),
    [availableColumns]
  )

  React.useEffect(() => {
    if (availableColumns.length > 0 && columnOrder.length === 0) {
      setColumnOrder(availableColumns.map(c => c.name))
    }
  }, [availableColumns, columnOrder.length])

  const {
    activeViewId,
    viewMode,
    showSwitchGuard,
    setShowSwitchGuard,
    invalidView,
    setInvalidView,
    repairMap,
    setRepairMap,
    currentColumnConfig,
    handleViewSelectRequest,
    handleSaveAndSwitch,
    handleDiscardAndSwitch,
    handleCancelSwitch,
    handleRepairAuto,
    handleRepairManual,
    handleFallbackDefault,
  } = useViewManager({
    fileId,
    availableColumns,
    defaultColumnOrder,
    sorting,
    setSorting,
    filterState,
    setFilterState,
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    setFilterError,
  })

  const {
    flatData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useGridData({
    tableName,
    sorting,
    filterState,
    setFilterError,
  })

  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return availableColumns.map(col => ({
      accessorKey: col.name,
      header: col.name,
      size: 150,
      meta: {
        type: col.type,
        sourceType: col.sourceType,
      },
      cell: info => formatForDisplay(info.getValue(), col.type)
    }))
  }, [availableColumns])

  const table = useReactTable({
    data: flatData,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
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

  const hasNextPageRef = useRef(hasNextPage)
  const isFetchingNextPageRef = useRef(isFetchingNextPage)
  const fetchNextPageRef = useRef(fetchNextPage)

  React.useEffect(() => {
    hasNextPageRef.current = hasNextPage
    isFetchingNextPageRef.current = isFetchingNextPage
    fetchNextPageRef.current = fetchNextPage
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  React.useEffect(() => {
    logGrid('mounted', { fileId, tableName })
    return () => {
      logGrid('unmounted', { fileId, tableName })
    }
  }, [fileId, tableName, logGrid])

  // Throttled state change logging — only react to meaningful user-driven changes
  // (sorting / filter changes), not every data fetch cycle
  React.useEffect(() => {
    logGrid('state.changed', {
      sortingCount: sorting.length,
      filterCount: filterState.conditions.length,
    })
  }, [
    sorting.length,
    filterState.conditions.length,
    logGrid,
  ])

  React.useEffect(() => {
    const container = parentRef.current
    if (!container) return

    let ticking = false
    const maybeLoadMore = () => {
      if (!hasNextPageRef.current || isFetchingNextPageRef.current) return
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceToBottom <= 240) {
        logGrid('load_more.trigger', {
          distanceToBottom,
          scrollTop: container.scrollTop,
          clientHeight: container.clientHeight,
          scrollHeight: container.scrollHeight,
        })
        void fetchNextPageRef.current()
      }
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        ticking = false
        maybeLoadMore()
      })
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    maybeLoadMore()

    return () => {
      container.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Re-check load-more after data changes (e.g. viewport still not filled after a page loads)
  React.useEffect(() => {
    const container = parentRef.current
    if (!container) return
    if (!hasNextPageRef.current || isFetchingNextPageRef.current) return
    // Use rAF to wait for layout to settle after new rows render
    const id = requestAnimationFrame(() => {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceToBottom <= 240) {
        void fetchNextPageRef.current()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [flatData.length])

  // Keep a ref to flatData so row callbacks stay stable across re-renders
  const flatDataRef = useRef(flatData)
  useEffect(() => {
    flatDataRef.current = flatData
  }, [flatData])

  const handleRowSelect = useCallback((rowId: string) => {
    logGrid('row.click', { rowId })
    setSelectedRowId(rowId)
  }, [logGrid])

  const handleRowOpen = useCallback((rowId: string) => {
    logGrid('row.double_click', { rowId })
    setSelectedRowId(rowId)
    const rowData = flatDataRef.current.find(r => String(r._ws_row_id) === rowId)
    if (rowData) {
      setDetailRow(rowData)
      setIsDetailOpen(true)
    }
  }, [logGrid])

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

  return (
    <div className="h-full flex flex-col w-full bg-white relative">
      <RowDetailSheet open={isDetailOpen} onOpenChange={setIsDetailOpen} row={detailRow} columns={columns} onNavigate={handleNavigate} hasPrev={navState.hasPrev} hasNext={navState.hasNext} />

      <UnsavedChangesDialog 
        open={showSwitchGuard} 
        onOpenChange={setShowSwitchGuard}
        onCancel={handleCancelSwitch}
        onDiscard={handleDiscardAndSwitch}
        onSave={handleSaveAndSwitch}
      />

      <ViewRepairDialog
        invalidView={invalidView}
        setInvalidView={setInvalidView}
        repairMap={repairMap}
        setRepairMap={setRepairMap}
        availableColumns={availableColumns}
        onFallback={handleFallbackDefault}
        onRepairAuto={handleRepairAuto}
        onRepairManual={handleRepairManual}
      />

      <GridToolbar
        fileId={fileId}
        tableName={tableName}
        columns={columns}
        availableColumns={availableColumns}
        filterState={filterState}
        setFilterState={setFilterState}
        filterError={filterError}
        setFilterError={setFilterError}
        sorting={sorting}
        currentColumnConfig={currentColumnConfig}
        activeViewId={activeViewId}
        viewMode={viewMode}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onViewSelect={handleViewSelectRequest}
      />

      <ActiveFiltersList
        filterState={filterState}
        setFilterState={setFilterState}
        availableColumns={availableColumns}
        viewMode={viewMode}
      />

      {isError && (
        <div className="px-3 py-2 border-b border-red-100 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <span>{(error as Error).message}</span>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => refetch()}>
            <RefreshCcw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={parentRef}
            className="flex-1 overflow-auto w-full"
          >
            <div className="min-w-max min-h-full flex flex-col">
              <div className="sticky top-0 z-20 flex bg-zinc-50/95 backdrop-blur shadow-sm border-b border-zinc-200">
                {table.getHeaderGroups().map(headerGroup => (
                  <div key={headerGroup.id} className="flex">
                    {headerGroup.headers.map(header => (
                      <GridHeader 
                        key={header.id}
                        header={header}
                        columns={columns}
                        onModifyStructure={onModifyStructure}
                        onHideColumn={handleHideColumn}
                      />
                    ))}
                  </div>
                ))}
              </div>

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
                        rowId={row.id}
                        isSelected={row.id === selectedRowId}
                        onSelect={handleRowSelect}
                        onOpen={handleRowOpen}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="h-12 flex items-center justify-center">
                {isFetchingNextPage && <div className="flex items-center gap-2 text-zinc-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading more...</div>}
              </div>
            </div>
          </div>
        </div>

        {isSidebarOpen && file && (
          <FieldListSidebar
            file={file}
            columnVisibility={columnVisibility}
            onVisibilityChange={setColumnVisibility}
            columnOrder={columnOrder}
            onOrderChange={setColumnOrder}
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
