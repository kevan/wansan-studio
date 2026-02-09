import React, { useState } from 'react'
import { Layout, Save, Trash2, Check, ChevronDown, Plus } from 'lucide-react'
import { useProjectStore } from '@/stores/useProjectStore'
import { TableView } from '@shared/types/project'
import { FilterRule } from '@shared/types/filter'
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

interface ViewSwitcherProps {
  fileId: string
  currentFilters: FilterRule[]
  currentSort: { id: string; desc: boolean }[]
  currentColumnConfig?: import('@shared/types/project').TableView['columnConfig']
  onViewSelect: (view: TableView | null) => void
  activeViewId: string | null
}

export function ViewSwitcher({ 
  fileId, 
  currentFilters, 
  currentSort, 
  currentColumnConfig,
  onViewSelect, 
  activeViewId 
}: ViewSwitcherProps) {
  const { tableViews, saveTableView, deleteTableView } = useProjectStore()
  const views = (tableViews || {})[fileId] || []
  const activeView = views.find(v => v.id === activeViewId)

  const [newViewName, setNewViewName] = useState('')
  const [isSaveOpen, setIsSaveOpen] = useState(false)

  const handleSave = () => {
    if (!newViewName.trim()) return
    const newView: TableView = {
      id: uuidv4(),
      name: newViewName,
      filters: currentFilters,
      sort: currentSort,
      columnConfig: currentColumnConfig
    }
    saveTableView(fileId, newView)
    onViewSelect(newView)
    setNewViewName('')
    setIsSaveOpen(false)
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
              {activeView ? activeView.name : '默认视图'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem 
            className={cn("flex items-center justify-between", !activeViewId && "bg-indigo-50 text-indigo-600")}
            onClick={() => onViewSelect(null)}
          >
            <span className="text-xs">默认视图 (所有数据)</span>
            {!activeViewId && <Check className="w-3.5 h-3.5" />}
          </DropdownMenuItem>
          
          {views.length > 0 && <DropdownMenuSeparator />}
          
          {views.map(view => (
            <DropdownMenuItem 
              key={view.id}
              className={cn("flex items-center justify-between group", activeViewId === view.id && "bg-indigo-50 text-indigo-600")}
              onClick={() => onViewSelect(view)}
            >
              <span className="text-xs truncate">{view.name}</span>
              <div className="flex items-center gap-1">
                {activeViewId === view.id && <Check className="w-3.5 h-3.5" />}
                <button 
                  onClick={(e) => handleDelete(e, view.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-indigo-600" title="另存为新视图">
            <Save className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3 h-3" /> 保存当前配置为视图
            </div>
            <Input 
              placeholder="视图名称 (如: 高价值客户)" 
              className="h-8 text-xs" 
              value={newViewName}
              onChange={e => setNewViewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <Button size="sm" className="w-full h-8" onClick={handleSave}>
              确认保存
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
