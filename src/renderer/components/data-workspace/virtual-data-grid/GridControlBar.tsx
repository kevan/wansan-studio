import React, { useCallback } from 'react'
import { X, Plus, LayoutPanelTop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterState, OPERATOR_CONFIG } from '@shared/types/filter'
import { ColumnSchema } from '@shared/types'
import { ExplorerViewMode, TableView } from '@shared/types/project'
import { cn } from '@/utils/cn'
import { FilterManager } from '../filter-manager'
import { ViewSwitcher } from '../view-switcher'
import { SortingState } from '@tanstack/react-table'

interface GridControlBarProps {
  // Data & Filter Props
  tableName: string
  columns: ColumnSchema[]
  filterState: FilterState
  setFilterState: (f: FilterState | ((prev: FilterState) => FilterState)) => void
  availableColumns: ColumnSchema[]
  viewMode: ExplorerViewMode
  filterError: string | null
  setFilterError: (e: string | null) => void
  
  // Toolbar & View Props
  fileId: string
  sorting: SortingState
  currentColumnConfig: { hidden: string[]; order: string[] }
  activeViewId: string | null
  isSidebarOpen: boolean
  setIsSidebarOpen: (o: boolean) => void
  onViewSelect: (view: TableView | null) => void
}

export function GridControlBar({
  tableName,
  columns,
  filterState,
  setFilterState,
  availableColumns,
  viewMode,
  filterError,
  setFilterError,
  fileId,
  sorting,
  currentColumnConfig,
  activeViewId,
  isSidebarOpen,
  setIsSidebarOpen,
  onViewSelect,
}: GridControlBarProps) {
  const handleRemoveChip = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFilterState(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id),
    }))
  }, [setFilterState])

  const handleToggleChip = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFilterState(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c),
    }))
  }, [setFilterState])

  const handleClearFilters = useCallback(() => {
    setFilterState({ conjunction: 'AND', conditions: [] })
  }, [setFilterState])

  const allConditions = filterState.conditions

  const filterTrigger = (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-7 text-[10px] gap-1.5 px-2 rounded-full border border-dashed border-zinc-200 hover:border-indigo-300 hover:text-indigo-600 transition-all"
    >
      <Plus className="w-3 h-3" />
      Add Filter
    </Button>
  )

  return (
    <div className="px-2 py-2 border-b border-zinc-100/60 bg-white/40 backdrop-blur-md flex items-center justify-between min-h-[48px] gap-4">
      {/* Left Section: Context & Filters */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 mr-1 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 select-none">View</span>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap',
            viewMode === 'saved_dirty' && 'border-amber-200 text-amber-700 bg-amber-50',
            viewMode === 'saved_clean' && 'border-emerald-200 text-emerald-700 bg-emerald-50',
            viewMode === 'unsaved_custom' && 'border-indigo-200 text-indigo-700 bg-indigo-50',
            viewMode === 'default_clean' && 'border-zinc-200 text-zinc-500 bg-white',
            viewMode === 'partially_invalid' && 'border-red-200 text-red-700 bg-red-50',
          )}>
            {viewMode.replace('_', ' ')}
          </span>
        </div>

        <div className="w-px h-4 bg-zinc-200 mx-0.5 flex-shrink-0" />

        <div className="flex flex-wrap items-center gap-2">
          {allConditions.map(c => {
            const col = availableColumns.find(x => x.name === c.columnName)
            const label = col?.semantic?.aliases?.[0] || c.columnName
            const opLabel = OPERATOR_CONFIG[c.operator].symbol || OPERATOR_CONFIG[c.operator].label
            
            const chipTrigger = (
              <div
                className={cn(
                  'text-[11px] h-7 px-2.5 rounded-full border flex items-center gap-2 cursor-pointer transition-all hover:shadow-sm group/chip',
                  c.enabled 
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100/50' 
                    : 'border-zinc-200 bg-white text-zinc-400 opacity-60 hover:opacity-100 hover:border-zinc-300'
                )}
              >
                <div 
                  className="flex items-center gap-1.5"
                  onClick={(e) => handleToggleChip(c.id, e)}
                  title={c.enabled ? 'Disable condition' : 'Enable condition'}
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">{opLabel}</span>
                  <span className="font-normal truncate max-w-[120px]">
                    {c.operator.includes('null') ? '' : String(c.value)}
                  </span>
                </div>
                <button 
                  className="hover:text-red-500 opacity-0 group-hover/chip:opacity-100 transition-opacity ml-1" 
                  onClick={(e) => handleRemoveChip(c.id, e)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )

            return (
              <FilterManager
                key={c.id}
                tableName={tableName}
                columns={columns}
                filterState={filterState}
                onChange={(next) => {
                  setFilterError(null)
                  setFilterState(next)
                }}
                trigger={chipTrigger}
                errorMessage={filterError}
              />
            )
          })}

          <FilterManager
            tableName={tableName}
            columns={columns}
            filterState={filterState}
            onChange={(next) => {
              setFilterError(null)
              setFilterState(next)
            }}
            trigger={filterTrigger}
            errorMessage={filterError}
          />

          {filterError && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-medium animate-in fade-in slide-in-from-left-2">
              <span className="truncate max-w-[200px]">{filterError}</span>
              <button onClick={() => setFilterError(null)} className="hover:text-red-800">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {allConditions.length > 0 && !filterError && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] text-zinc-400 hover:text-red-500 font-medium px-2" 
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Right Section: Fields & Views */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 text-[11px] gap-2 px-3 rounded-full transition-all font-medium', 
            isSidebarOpen ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-zinc-500 hover:bg-zinc-100'
          )}
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


