import { useState, useMemo, useCallback, useEffect } from 'react'
import { SortingState } from '@tanstack/react-table'
import { FilterState } from '@shared/types/filter'
import { ColumnSchema } from '@shared/types'
import { TableView, ExplorerViewMode } from '@shared/types/project'
import {
  calculateExplorerDirty,
  resolveExplorerViewMode,
  useProjectStore,
} from '@/stores/useProjectStore'
import {
  normalizeFilters,
  normalizeVisibility,
  buildViewMeta,
  REMOVE_MAPPING_VALUE,
} from './utils'

interface InvalidViewContext {
  view: TableView
  missingColumns: string[]
}

interface UseViewManagerProps {
  fileId: string
  availableColumns: ColumnSchema[]
  defaultColumnOrder: string[]
  sorting: SortingState
  setSorting: (s: SortingState) => void
  filterState: FilterState
  setFilterState: (f: FilterState) => void
  columnVisibility: Record<string, boolean>
  setColumnVisibility: (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
  columnOrder: string[]
  setColumnOrder: (o: string[]) => void
  setFilterError: (e: string | null) => void
}

export function useViewManager({
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
}: UseViewManagerProps) {
  const { tableViews, saveTableView, updateTableView } = useProjectStore()
  const views = useMemo(() => (tableViews || {})[fileId] || [], [tableViews, fileId])

  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [showSwitchGuard, setShowSwitchGuard] = useState(false)
  const [pendingViewSwitch, setPendingViewSwitch] = useState<TableView | null | undefined>(undefined)
  const [invalidView, setInvalidView] = useState<InvalidViewContext | null>(null)
  const [repairMap, setRepairMap] = useState<Record<string, string>>({})

  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) || null,
    [views, activeViewId]
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

    const nFilters = normalizeFilters(view.filters)
    nFilters.conditions.forEach(c => {
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

    return Array.from(missing)
  }, [availableColumns])

  useEffect(() => {
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
  }, [validateViewColumns, defaultColumnOrder, setFilterError, setFilterState, setSorting, setColumnVisibility, setColumnOrder])

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

    const nFilters = normalizeFilters(view.filters)
    const repairedFilters: FilterState = {
      conjunction: nFilters.conjunction,
      conditions: nFilters.conditions
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

  return {
    activeViewId,
    activeView,
    viewMode,
    isDirty,
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
  }
}
