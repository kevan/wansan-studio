import React, { useState } from 'react'
import { 
  Search, 
  Eye, 
  EyeOff, 
  Columns as ColumnsIcon,
  X,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Sparkles,
  Link as LinkIcon,
  ChevronRight
} from 'lucide-react'
import { FileNode } from '@shared/types'
import { cn } from '@/utils/cn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FieldListSidebarProps {
  file: FileNode
  columnVisibility: Record<string, boolean>
  onVisibilityChange: (visibility: Record<string, boolean>) => void
  onClose: () => void
}

/** Helper to get icon for column type */
function getTypeIcon(type: string) {
  const t = type.toUpperCase()
  if (['INT', 'BIGINT', 'DOUBLE', 'DECIMAL', 'FLOAT', 'NUMBER', 'REAL', 'INTEGER'].some(k => t.includes(k))) return <Hash className="w-3 h-3" />
  if (['DATE', 'TIME', 'TIMESTAMP'].some(k => t.includes(k))) return <Calendar className="w-3 h-3" />
  if (['BOOLEAN'].includes(t)) return <ToggleLeft className="w-3 h-3" />
  return <Type className="w-3 h-3" />
}

export function FieldListSidebar({ 
  file, 
  columnVisibility, 
  onVisibilityChange,
  onClose 
}: FieldListSidebarProps) {
  const [search, setSearch] = useState('')

  // We use viewSchema if available (enriched), otherwise physical columns
  const allColumns = (file.viewSchema && file.viewSchema.length > 0) 
    ? file.viewSchema 
    : file.columns

  const filteredColumns = allColumns.filter(c => 
    c.name !== '_ws_row_id' && 
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleVisibility = (colName: string) => {
    const isVisible = columnVisibility[colName] !== false
    onVisibilityChange({
      ...columnVisibility,
      [colName]: !isVisible
    })
  }

  const showAll = () => {
    const newVisibility: Record<string, boolean> = {}
    allColumns.forEach(c => newVisibility[c.name] = true)
    onVisibilityChange(newVisibility)
  }

  const hideAll = () => {
    const newVisibility: Record<string, boolean> = {}
    allColumns.forEach(c => newVisibility[c.name] = false)
    onVisibilityChange(newVisibility)
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-zinc-200 shadow-xl w-64 z-30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <ColumnsIcon className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-bold text-zinc-700">Fields</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {allColumns.filter(c => c.name !== '_ws_row_id').length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search & Bulk Actions */}
      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input 
            placeholder="Search fields..." 
            className="pl-8 h-9 text-xs rounded-lg border-zinc-100 focus:ring-indigo-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] font-bold uppercase tracking-wider" onClick={showAll}>Show All</Button>
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] font-bold uppercase tracking-wider" onClick={hideAll}>Hide All</Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="px-2 pb-4 space-y-0.5">
          {filteredColumns.map(col => {
            const isVisible = columnVisibility[col.name] !== false
            const isMetric = col.sourceType === 'metric'
            const isAI = col.sourceType === 'ai'
            const isJoined = col.sourceType === 'joined'

            return (
              <div 
                key={col.name}
                className={cn(
                  "group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors cursor-pointer",
                  isVisible ? "hover:bg-zinc-50" : "opacity-50 grayscale hover:bg-zinc-50"
                )}
                onClick={() => toggleVisibility(col.name)}
              >
                <div className={cn(
                  "p-1 rounded",
                  isMetric ? "bg-green-50 text-green-600" :
                  isAI ? "bg-purple-50 text-purple-600" :
                  isJoined ? "bg-orange-50 text-orange-600" :
                  "bg-zinc-100 text-zinc-400"
                )}>
                  {isMetric ? <ChevronRight className="w-3 h-3" /> :
                   isAI ? <Sparkles className="w-3 h-3" /> :
                   isJoined ? <LinkIcon className="w-3 h-3" /> :
                   getTypeIcon(col.type)}
                </div>
                
                <span className={cn(
                  "text-xs flex-1 truncate",
                  isVisible ? "text-zinc-700 font-medium" : "text-zinc-400"
                )}>
                  {col.name}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isVisible ? <Eye className="w-3.5 h-3.5 text-indigo-500" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-300" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}