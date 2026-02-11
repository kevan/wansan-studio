import React, { useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterState, OPERATOR_CONFIG } from '@shared/types/filter'
import { ColumnSchema } from '@shared/types'
import { ExplorerViewMode } from '@shared/types/project'
import { cn } from '@/utils/cn'

interface ActiveFiltersListProps {
  filterState: FilterState
  setFilterState: (f: FilterState | ((prev: FilterState) => FilterState)) => void
  availableColumns: ColumnSchema[]
  viewMode: ExplorerViewMode
}

export function ActiveFiltersList({
  filterState,
  setFilterState,
  availableColumns,
  viewMode,
}: ActiveFiltersListProps) {
  const handleRemoveChip = useCallback((id: string) => {
    setFilterState(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id),
    }))
  }, [setFilterState])

  const handleToggleChip = useCallback((id: string) => {
    setFilterState(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c),
    }))
  }, [setFilterState])

  const handleClearFilters = useCallback(() => {
    setFilterState({ conjunction: 'AND', conditions: [] })
  }, [setFilterState])

  const allConditions = filterState.conditions
  const activeConditions = allConditions.filter(c => c.enabled)

  return (
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
  )
}
