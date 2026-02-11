import React, { useMemo, useState } from 'react'
import { Layout, Save, Trash2, Check, ChevronDown, Plus, RotateCcw, Pencil } from 'lucide-react'
import { useProjectStore } from '@/stores/useProjectStore'
import { ExplorerViewMode, TableView } from '@shared/types/project'
import { FilterState } from '@shared/types/filter'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/utils/cn'
import { v4 as uuidv4 } from 'uuid'
import { useTranslation } from 'react-i18next'

interface ViewSwitcherProps {
  fileId: string
  currentFilters: FilterState
  currentSort: { id: string; desc: boolean }[]
  currentColumnConfig?: import('@shared/types/project').TableView['columnConfig']
  currentSchemaColumns: string[]
  onViewSelect: (view: TableView | null) => void
  activeViewId: string | null
  mode: ExplorerViewMode
}

export function ViewSwitcher({ 
  fileId, 
  currentFilters, 
  currentSort, 
  currentColumnConfig,
  currentSchemaColumns,
  onViewSelect, 
  activeViewId,
  mode
}: ViewSwitcherProps) {
  const { t } = useTranslation('common')
  const { tableViews, saveTableView, deleteTableView } = useProjectStore()
  const views = (tableViews || {})[fileId] || []
  const activeView = views.find(v => v.id === activeViewId)

  const [newViewName, setNewViewName] = useState('')
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [renameViewId, setRenameViewId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const schemaHash = useMemo(
    () => [...currentSchemaColumns].sort().join('|'),
    [currentSchemaColumns]
  )

  const getFilterCount = (view: TableView) => {
    if (Array.isArray(view.filters)) return view.filters.filter(c => c.enabled).length
    return view.filters.conditions.filter(c => c.enabled).length
  }

  const buildViewMeta = () => ({
    updatedAt: Date.now(),
    filterCount: currentFilters.conditions.filter(c => c.enabled).length,
    hiddenCount: (currentColumnConfig?.hidden || []).length,
    sortCount: currentSort.length,
    schemaHash
  })

  const handleSave = () => {
    if (!newViewName.trim()) return
    const newView: TableView = {
      id: uuidv4(),
      name: newViewName.trim(),
      filters: currentFilters,
      sort: currentSort,
      columnConfig: currentColumnConfig,
      meta: buildViewMeta()
    }
    saveTableView(fileId, newView)
    onViewSelect(newView)
    setNewViewName('')
    setIsSaveOpen(false)
  }

  const handleUpdateCurrent = () => {
    if (!activeView) return
    const next: TableView = {
      ...activeView,
      filters: currentFilters,
      sort: currentSort,
      columnConfig: currentColumnConfig,
      meta: buildViewMeta(),
    }
    saveTableView(fileId, next)
    onViewSelect(next)
  }

  const handleResetToView = () => {
    if (!activeView) return
    onViewSelect(activeView)
  }

  const handleRename = (id: string) => {
    if (!renameValue.trim()) return
    const target = views.find(v => v.id === id)
    if (!target) return
    const next: TableView = {
      ...target,
      name: renameValue.trim(),
      meta: {
        ...target.meta,
        updatedAt: Date.now(),
      }
    }
    saveTableView(fileId, next)
    if (activeViewId === id) onViewSelect(next)
    setRenameViewId(null)
    setRenameValue('')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteTableView(fileId, id)
    if (activeViewId === id) {
      onViewSelect(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-2 text-zinc-600 hover:text-zinc-900">
            <Layout className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold max-w-[120px] truncate">
              {activeView ? activeView.name : t('default_view', 'Default View')}
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wide",
                mode === 'saved_dirty' && 'border-amber-200 text-amber-700 bg-amber-50',
                mode === 'saved_clean' && 'border-emerald-200 text-emerald-700 bg-emerald-50',
                mode === 'unsaved_custom' && 'border-indigo-200 text-indigo-700 bg-indigo-50',
                mode === 'default_clean' && 'border-zinc-200 text-zinc-500 bg-white',
                mode === 'partially_invalid' && 'border-red-200 text-red-700 bg-red-50'
              )}
            >
              {mode === 'saved_dirty' && t('view_state_dirty', 'dirty')}
              {mode === 'saved_clean' && t('view_state_saved', 'saved')}
              {mode === 'unsaved_custom' && t('view_state_custom', 'custom')}
              {mode === 'default_clean' && t('view_state_default', 'default')}
              {mode === 'partially_invalid' && t('view_state_invalid', 'invalid')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuItem 
            className={cn("flex items-center justify-between", !activeViewId && "bg-indigo-50 text-indigo-600")}
            onClick={() => onViewSelect(null)}
          >
            <span className="text-xs">{t('default_view_all_data', 'Default View (all data)')}</span>
            {!activeViewId && <Check className="w-3.5 h-3.5" />}
          </DropdownMenuItem>
          
          {views.length > 0 && <DropdownMenuSeparator />}
          
          {views.map(view => (
            <div key={view.id} className="px-1 py-1">
              <DropdownMenuItem
                className={cn("flex items-start justify-between group", activeViewId === view.id && "bg-indigo-50 text-indigo-600")}
                onClick={() => onViewSelect(view)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate font-semibold">{view.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {t('view_meta_compact', {
                      defaultValue: '{{filters}} filters · {{hidden}} hidden · {{sort}} sort',
                      filters: view.meta?.filterCount ?? getFilterCount(view),
                      hidden: view.meta?.hiddenCount ?? view.columnConfig?.hidden?.length ?? 0,
                      sort: view.meta?.sortCount ?? view.sort?.length ?? 0,
                    })}
                  </div>
                  {view.meta?.updatedAt && (
                    <div className="text-[10px] text-zinc-400">
                      {t('view_updated_at', {
                        defaultValue: 'Updated {{time}}',
                        time: new Date(view.meta.updatedAt).toLocaleString(),
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {activeViewId === view.id && <Check className="w-3.5 h-3.5" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setRenameViewId(view.id)
                      setRenameValue(view.name)
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-all"
                    title={t('rename', 'Rename')}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, view.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    title={t('delete', 'Delete')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </DropdownMenuItem>

              {renameViewId === view.id && (
                <div className="px-2 pb-2 pt-1 flex items-center gap-2">
                  <Input
                    className="h-7 text-xs"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(view.id)}
                  />
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleRename(view.id)}>
                    {t('save', 'Save')}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {activeView && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleResetToView}
                  disabled={mode !== 'saved_dirty'}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {t('reset_to_view', 'Reset To View')}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleUpdateCurrent}
                  disabled={mode !== 'saved_dirty'}
                >
                  <Save className="w-3 h-3 mr-1" />
                  {t('update_current', 'Update Current')}
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-indigo-600" title={t('save_as_new_view', 'Save As New View')}>
            <Save className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3 h-3" /> {t('save_current_as_view', 'Save current config as view')}
            </div>
            <Input 
              placeholder={t('view_name_placeholder', 'View name (e.g. High Value Customers)')}
              className="h-8 text-xs" 
              value={newViewName}
              onChange={e => setNewViewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <Button size="sm" className="w-full h-8" onClick={handleSave}>
              {t('confirm_save_view', 'Save View')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
