import React from 'react'
import { LayoutPanelTop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterManager } from '../filter-manager'
import { ViewSwitcher } from '../view-switcher'
import { FilterState } from '@shared/types/filter'
import { SortingState } from '@tanstack/react-table'
import { ColumnSchema } from '@shared/types'
import { ExplorerViewMode, TableView } from '@shared/types/project'
import { cn } from '@/utils/cn'

interface GridToolbarProps {
  fileId: string
  tableName: string
  columns: ColumnSchema[]
  availableColumns: ColumnSchema[]
  filterState: FilterState
  setFilterState: (f: FilterState) => void
  filterError: string | null
  setFilterError: (e: string | null) => void
  sorting: SortingState
  currentColumnConfig: { hidden: string[]; order: string[] }
  activeViewId: string | null
  viewMode: ExplorerViewMode
  isSidebarOpen: boolean
  setIsSidebarOpen: (o: boolean) => void
  onViewSelect: (view: TableView | null) => void
}

export function GridToolbar({
  fileId,
  tableName,
  columns,
  availableColumns,
  filterState,
  setFilterState,
  filterError,
  setFilterError,
  sorting,
  currentColumnConfig,
  activeViewId,
  viewMode,
  isSidebarOpen,
  setIsSidebarOpen,
  onViewSelect,
}: GridToolbarProps) {
  return (
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
          onViewSelect={onViewSelect}
          activeViewId={activeViewId}
          mode={viewMode}
        />
      </div>
    </div>
  )
}
