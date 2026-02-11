/**
 * VirtualDataGrid - High-Performance Virtual Scrolling Grid
 * Based on: docs/SPEC_DATA_EXPLORER_V4_GRIP.md
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
  X,
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
import { FilterManager } from './filter-manager'
import { ViewSwitcher } from './view-switcher'
import { FieldListSidebar } from './field-list-sidebar'
import {
  FilterState,
  OPERATOR_CONFIG,
  filterStateToSQL,
  validateFilterState,
} from '@shared/types/filter'
import { ExplorerViewMode, TableView } from '@shared/types/project'
import {
  calculateExplorerDirty,
  resolveExplorerViewMode,
  useProjectStore,
} from '@/stores/useProjectStore'
import { ColumnSchema } from '@shared/types'
import { useToastStore } from '@/stores/useToastStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface VirtualDataGridProps {
  fileId: string
  tableName: string
  columns: Array<ColumnSchema>
  totalRows?: number
  onModifyStructure?: () => void
}

interface InvalidViewContext {
  view: TableView
  missingColumns: string[]
}

const PAGE_SIZE = 100
const ROW_HEIGHT = 35
const OVERSCAN = 5
const REMOVE_MAPPING_VALUE = '__REMOVE__'

function normalizeFilters(filters: TableView['filters']): FilterState {
  if (Array.isArray(filters)) {
    return { conjunction: 'AND', conditions: filters }
  }
  return filters || { conjunction: 'AND', conditions: [] }
}

function normalizeVisibility(view: TableView | null): Record<string, boolean> {
  if (!view?.columnConfig?.hidden) return {}
  const visibility: Record<string, boolean> = {}
  view.columnConfig.hidden.forEach(col => {
    visibility[col] = false
  })
  return visibility
}

function buildViewMeta(
  state: {
    filters: FilterState
    sorting: SortingState
    columnConfig: { hidden: string[]; order: string[] }
  },
  columns: ColumnSchema[]
) {
  return {
    updatedAt: Date.now(),
    filterCount: state.filters.conditions.filter(c => c.enabled).length,
    hiddenCount: state.columnConfig.hidden.length,
    sortCount: state.sorting.length,
    schemaHash: [...columns.map(c => c.name)].sort().join('|')
  }
}

function getTypeIcon(type: string) {
  const t = type.toUpperCase()
  if (['INT', 'BIGINT', 'DOUBLE', 'DECIMAL', 'FLOAT', 'NUMBER', 'REAL', 'INTEGER'].some(k => t.includes(k))) return <Hash className="w-3 h-3" />
  if (['DATE', 'TIME', 'TIMESTAMP'].some(k => t.includes(k))) return <Calendar className="w-3 h-3" />
  if (['BOOLEAN'].includes(t)) return <ToggleLeft className="w-3 h-3" />
  return <Type className="w-3 h-3" />
}

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

const GridRow = memo(function GridRow({
  row,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  row: Row<Record<string, unknown>>
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors',
        isSelected && 'bg-indigo-50 hover:bg-indigo-50/80'
      )}
      style={{ height: ROW_HEIGHT }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
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

export function VirtualDataGrid({
  fileId,
  tableName,
  columns,
  totalRows,
  onModifyStructure,
}: VirtualDataGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const toast = useToastStore()
  const {
    files,
    tableViews,
    saveTableView,
    updateTableView,
  } = useProjectStore()

  const file = files.find(f => f.id === fileId)
  const views = useMemo(() => (tableViews || {})[fileId] || [], [tableViews, fileId])

  const [sorting, setSorting] = useState<SortingState>([])
  const [filterState, setFilterState] = useState<FilterState>({ conjunction: 'AND', conditions: [] })
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null)

  const [filterError, setFilterError] = useState<string | null>(null)
  const [showSwitchGuard, setShowSwitchGuard] = useState(false)
  const [pendingViewSwitch, setPendingViewSwitch] = useState<TableView | null | undefined>(undefined)
  const [invalidView, setInvalidView] = useState<InvalidViewContext | null>(null)
  const [repairMap, setRepairMap] = useState<Record<string, string>>({})

  const availableColumns = useMemo(
    () => columns.filter(c => c.name !== '_ws_row_id'),
    [columns]
  )

  React.useEffect(() => {
    if (availableColumns.length > 0 && columnOrder.length === 0) {
      setColumnOrder(availableColumns.map(c => c.name))
    }
  }, [availableColumns, columnOrder.length])


  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) || null,
    [views, activeViewId]
  )

  const defaultColumnOrder = useMemo(
    () => availableColumns.map(c => c.name),
    [availableColumns]
  )

  const currentColumnConfig = useMemo(
    () => ({
      hidden: Object.entries(columnVisibility).filter(([_, v]) => !v).map(([k]) => k),
      order: columnOrder
    }),
    [columnVisibility, columnOrder]
  )

  const isDirty = useMemo(
    () => calculateExplorerDirty(
      activeView,
      filterState,
      sorting,
      columnVisibility,
      columnOrder,
      defaultColumnOrder
    ),
    [activeView, filterState, sorting, columnVisibility, columnOrder, defaultColumnOrder]
  )

  const viewMode: ExplorerViewMode = useMemo(
    () => resolveExplorerViewMode(!!activeView, isDirty, !!invalidView),
    [activeView, isDirty, invalidView]
  )

  const validateViewColumns = useCallback((view: TableView): string[] => {
    const schema = new Set(availableColumns.map(c => c.name))
    const missing = new Set<string>()

    const normalizedFilters = normalizeFilters(view.filters)
    normalizedFilters.conditions.forEach(c => {
      if (!schema.has(c.columnName)) missing.add(c.columnName)
    })

    const sortItems = view.sort || []
    sortItems.forEach(s => {
      if (!schema.has(s.id)) missing.add(s.id)
    })

    const hiddenItems = view.columnConfig?.hidden || []
    hiddenItems.forEach(name => {
      if (!schema.has(name)) missing.add(name)
    })

    const orderItems = view.columnConfig?.order || []
    orderItems.forEach(name => {
      if (!schema.has(name)) missing.add(name)
    })

    const schemaHash = [...schema].sort().join('|')
    if (view.meta?.schemaHash && view.meta.schemaHash !== schemaHash) {
      orderItems.forEach(name => {
        if (!schema.has(name)) missing.add(name)
      })
    }

    return Array.from(missing)
  }, [availableColumns])

  React.useEffect(() => {
    if (!activeView) return
    const missing = validateViewColumns(activeView)
    if (missing.length > 0) {
      setInvalidView({ view: activeView, missingColumns: missing })
      const initialMap: Record<string, string> = {}
      missing.forEach(col => {
        initialMap[col] = REMOVE_MAPPING_VALUE
      })
      setRepairMap(initialMap)
    }
  }, [activeView, validateViewColumns])

  const applyViewSelection = useCallback((view: TableView | null) => {
    setFilterError(null)

    if (view) {
      const missing = validateViewColumns(view)
      if (missing.length > 0) {
        setInvalidView({ view, missingColumns: missing })
        const initialMap: Record<string, string> = {}
        missing.forEach(col => {
          initialMap[col] = REMOVE_MAPPING_VALUE
        })
        setRepairMap(initialMap)
        return
      }

      setFilterState(normalizeFilters(view.filters))
      setSorting(view.sort || [])
      setActiveViewId(view.id)
      setColumnVisibility(normalizeVisibility(view))
      setColumnOrder(view.columnConfig?.order || defaultColumnOrder)
      return
    }

    setFilterState({ conjunction: 'AND', conditions: [] })
    setSorting([])
    setActiveViewId(null)
    setColumnVisibility({})
    setColumnOrder(defaultColumnOrder)
  }, [validateViewColumns, defaultColumnOrder])

  const getCurrentViewSnapshot = useCallback((name: string, id?: string): TableView => {
    return {
      id: id || crypto.randomUUID(),
      name,
      filters: filterState,
      sort: sorting,
      columnConfig: currentColumnConfig,
      meta: buildViewMeta(
        {
          filters: filterState,
          sorting,
          columnConfig: currentColumnConfig,
        },
        availableColumns
      )
    }
  }, [filterState, sorting, currentColumnConfig, availableColumns])

  const handleViewSelectRequest = useCallback((view: TableView | null) => {
    const isSame = (view?.id || null) === activeViewId
    if (isSame) return

    if (isDirty) {
      setPendingViewSwitch(view)
      setShowSwitchGuard(true)
      return
    }

    applyViewSelection(view)
  }, [activeViewId, isDirty, applyViewSelection])

  const handleSaveAndSwitch = useCallback(() => {
    if (activeView) {
      const updated = getCurrentViewSnapshot(activeView.name, activeView.id)
      saveTableView(fileId, updated)
    } else if (isDirty) {
      const autoName = `Auto Saved ${new Date().toLocaleString()}`
      const created = getCurrentViewSnapshot(autoName)
      saveTableView(fileId, created)
      setActiveViewId(created.id)
    }

    setShowSwitchGuard(false)
    applyViewSelection(pendingViewSwitch === undefined ? null : pendingViewSwitch)
    setPendingViewSwitch(undefined)
  }, [activeView, getCurrentViewSnapshot, saveTableView, fileId, isDirty, applyViewSelection, pendingViewSwitch])

  const handleDiscardAndSwitch = useCallback(() => {
    setShowSwitchGuard(false)
    applyViewSelection(pendingViewSwitch === undefined ? null : pendingViewSwitch)
    setPendingViewSwitch(undefined)
  }, [applyViewSelection, pendingViewSwitch])

  const handleCancelSwitch = useCallback(() => {
    setShowSwitchGuard(false)
    setPendingViewSwitch(undefined)
  }, [])

  const repairViewDefinition = useCallback((manualMapping: boolean) => {
    if (!invalidView) return null

    const missing = new Set(invalidView.missingColumns)
    const view = invalidView.view

    const mapColumn = (name: string) => {
      if (!missing.has(name)) return name
      const mapped = repairMap[name]
      if (manualMapping && mapped && mapped !== REMOVE_MAPPING_VALUE) return mapped
      return ''
    }

    const normalizedFilters = normalizeFilters(view.filters)
    const repairedFilters: FilterState = {
      conjunction: normalizedFilters.conjunction,
      conditions: normalizedFilters.conditions
        .map(c => ({ ...c, columnName: mapColumn(c.columnName) }))
        .filter(c => c.columnName)
    }

    const repairedSort = (view.sort || [])
      .map(s => ({ ...s, id: mapColumn(s.id) }))
      .filter(s => s.id)

    const repairedHidden = (view.columnConfig?.hidden || [])
      .map(name => mapColumn(name))
      .filter(Boolean)

    const repairedOrder = (view.columnConfig?.order || defaultColumnOrder)
      .map(name => mapColumn(name))
      .filter(Boolean)

    const repaired: TableView = {
      ...view,
      filters: repairedFilters,
      sort: repairedSort,
      columnConfig: {
        ...view.columnConfig,
        hidden: repairedHidden,
        order: repairedOrder,
      },
      meta: {
        ...buildViewMeta({
          filters: repairedFilters,
          sorting: repairedSort,
          columnConfig: {
            hidden: repairedHidden,
            order: repairedOrder,
          }
        }, availableColumns),
      }
    }

    return repaired
  }, [invalidView, repairMap, defaultColumnOrder, availableColumns])

  const handleRepairAuto = useCallback(() => {
    const repaired = repairViewDefinition(false)
    if (!repaired || !invalidView) return

    updateTableView(fileId, invalidView.view.id, repaired)
    setInvalidView(null)
    applyViewSelection(repaired)
  }, [repairViewDefinition, invalidView, updateTableView, fileId, applyViewSelection])

  const handleRepairManual = useCallback(() => {
    const repaired = repairViewDefinition(true)
    if (!repaired || !invalidView) return

    updateTableView(fileId, invalidView.view.id, repaired)
    setInvalidView(null)
    applyViewSelection(repaired)
  }, [repairViewDefinition, invalidView, updateTableView, fileId, applyViewSelection])

  const handleFallbackDefault = useCallback(() => {
    setInvalidView(null)
    applyViewSelection(null)
  }, [applyViewSelection])

  const queryFn = useCallback(async ({ pageParam = 0 }: { pageParam?: number }) => {
    const issues = validateFilterState(filterState)
    if (issues.length > 0) {
      const msg = `Filter validation failed: ${issues.map(i => i.code).join(', ')}`
      setFilterError(msg)
      throw new Error(msg)
    }

    const whereClause = filterStateToSQL(filterState)

    let orderBy = ''
    if (sorting.length > 0) {
      const sort = sorting[0]
      orderBy = `ORDER BY "${sort.id}" ${sort.desc ? 'DESC' : 'ASC'}`
    } else {
      orderBy = 'ORDER BY _ws_row_id ASC'
    }

    const sql = `SELECT * FROM "${tableName}" ${whereClause} ${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${pageParam}`
    const res = await window.electronAPI.runSQL(sql)
    if (!res.success) {
      setFilterError(res.error || 'SQL execution failed')
      throw new Error(res.error || 'SQL execution failed')
    }

    setFilterError(null)
    return (res.data?.data || []) as Record<string, unknown>[]
  }, [tableName, sorting, filterState])

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
    queryKey: ['table-data', tableName, sorting, filterState],
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined
      return allPages.length * PAGE_SIZE
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
    placeholderData: prev => prev,
  })

  React.useEffect(() => {
    if (isError && error) {
      toast.addToast({
        title: 'Filter error',
        description: (error as Error).message,
        type: 'error',
      })
    }
  }, [isError, error, toast])

  const flatData = useMemo(() => data?.pages.flat() ?? [], [data?.pages])

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

  const handleRowSelect = useCallback((rowData: Record<string, unknown>) => {
    setSelectedRowId(String(rowData._ws_row_id))
  }, [])

  const handleRowOpen = useCallback((rowData: Record<string, unknown>) => {
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

  const handleRemoveChip = (id: string) => {
    setFilterState(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id),
    }))
  }

  const handleToggleChip = (id: string) => {
    setFilterState(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c),
    }))
  }

  const handleClearFilters = () => {
    setFilterState({ conjunction: 'AND', conditions: [] })
  }

  const allConditions = filterState.conditions
  const activeConditions = allConditions.filter(c => c.enabled)

  if (isLoading) return <div className="h-full flex items-center justify-center text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading data...</div>

  return (
    <div className="h-full flex flex-col w-full bg-white relative">
      <RowDetailSheet open={isDetailOpen} onOpenChange={setIsDetailOpen} row={detailRow} columns={columns} onNavigate={handleNavigate} hasPrev={navState.hasPrev} hasNext={navState.hasNext} />

      <Dialog open={showSwitchGuard} onOpenChange={setShowSwitchGuard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved View Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes in the current view. Choose how to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelSwitch}>Cancel</Button>
            <Button variant="secondary" onClick={handleDiscardAndSwitch}>Switch Without Saving</Button>
            <Button onClick={handleSaveAndSwitch}>Save and Switch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invalidView} onOpenChange={(open) => !open && setInvalidView(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>View Needs Repair</DialogTitle>
            <DialogDescription>
              Some fields in this view no longer exist in the current schema. Repair before applying.
            </DialogDescription>
          </DialogHeader>

          {invalidView && (
            <div className="space-y-3 py-2">
              {invalidView.missingColumns.map((col) => (
                <div key={col} className="grid grid-cols-[1fr_1fr] gap-2 items-center">
                  <div className="text-xs text-zinc-600 truncate">Missing: <code>{col}</code></div>
                  <Select
                    value={repairMap[col] || REMOVE_MAPPING_VALUE}
                    onValueChange={(value) => {
                      setRepairMap(prev => ({ ...prev, [col]: value }))
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Remove (no mapping)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={REMOVE_MAPPING_VALUE}>Remove</SelectItem>
                      {availableColumns.map(c => (
                        <SelectItem key={c.name} value={c.name}>{c.semantic?.aliases?.[0] ? `${c.semantic.aliases[0]} (${c.name})` : c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleFallbackDefault}>Fallback to Default</Button>
            <Button variant="secondary" onClick={handleRepairAuto}>Auto Repair</Button>
            <Button onClick={handleRepairManual}>Apply Manual Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-zinc-100 bg-white/50 min-h-[44px]">
        <FilterManager
          tableName={tableName}
          columns={columns}
          filterState={filterState}
          onChange={(next) => {
            setFilterError(null)
            setFilterState(next)
          }}
          errorMessage={filterError}
        />

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 text-xs gap-1.5 px-2', isSidebarOpen && 'bg-indigo-50 text-indigo-600')}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <LayoutPanelTop className="w-3.5 h-3.5" />
            Fields
          </Button>
          <div className="w-px h-4 bg-zinc-200 mx-1" />
          <ViewSwitcher
            fileId={fileId}
            currentFilters={filterState}
            currentSort={sorting}
            currentColumnConfig={currentColumnConfig}
            currentSchemaColumns={availableColumns.map(c => c.name)}
            onViewSelect={handleViewSelectRequest}
            activeViewId={activeViewId}
            mode={viewMode}
          />
        </div>
      </div>

      <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/40 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Context</span>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full border',
          viewMode === 'saved_dirty' && 'border-amber-200 text-amber-700 bg-amber-50',
          viewMode === 'saved_clean' && 'border-emerald-200 text-emerald-700 bg-emerald-50',
          viewMode === 'unsaved_custom' && 'border-indigo-200 text-indigo-700 bg-indigo-50',
          viewMode === 'default_clean' && 'border-zinc-200 text-zinc-600 bg-white',
          viewMode === 'partially_invalid' && 'border-red-200 text-red-700 bg-red-50',
        )}>
          {viewMode.replace('_', ' ')}
        </span>
        {allConditions.map(c => {
          const col = availableColumns.find(x => x.name === c.columnName)
          const label = col?.semantic?.aliases?.[0] || c.columnName
          const opLabel = OPERATOR_CONFIG[c.operator].symbol || OPERATOR_CONFIG[c.operator].label
          return (
            <div
              key={c.id}
              className={cn(
                'text-[11px] px-2 py-1 rounded-full border flex items-center gap-1.5',
                c.enabled ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-zinc-200 bg-white text-zinc-500'
              )}
            >
              <button
                className="flex-1 text-left hover:underline"
                onClick={() => handleToggleChip(c.id)}
                title={c.enabled ? 'Disable condition' : 'Enable condition'}
              >
                {label} {opLabel} {c.operator.includes('null') ? '' : String(c.value)}
              </button>
              <button className="hover:text-red-600" onClick={() => handleRemoveChip(c.id)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
        {activeConditions.length > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={handleClearFilters}>Clear All</Button>
        )}
      </div>

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
                    {headerGroup.headers.map(header => {
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
                        onClick={() => handleRowSelect(row.original)}
                        onDoubleClick={() => handleRowOpen(row.original)}
                      />
                    </div>
                  )
                })}
              </div>

              <div ref={loadMoreRef} className="h-12 flex items-center justify-center">
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
