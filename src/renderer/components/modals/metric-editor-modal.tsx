import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { FileNode, SmartMetric } from '@shared/types'
import { useProjectStore } from '../../stores/useProjectStore'
import { Calculator, Database, Table, Link2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getJoinedColumnName } from '@shared/naming-utils'

interface MetricEditorModalProps {
  isOpen: boolean
  onClose: () => void
  file: FileNode
  initialMetric?: SmartMetric
  onSave: (metric: SmartMetric) => void
}

export function MetricEditorModal({
  isOpen,
  onClose,
  file,
  initialMetric,
  onSave,
}: MetricEditorModalProps) {
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [expression, setExpression] = useState('')
  const [dataType, setDataType] = useState('DOUBLE')

  const { files, relations } = useProjectStore()

  // Reset state when modal opens or initialMetric changes
  useEffect(() => {
    if (isOpen) {
      if (initialMetric) {
        setName(initialMetric.name)
        setLabel(initialMetric.label)
        setExpression(initialMetric.sqlExpression)
        setDataType(initialMetric.dataType || 'DOUBLE')
      } else {
        setName('')
        setLabel('')
        setExpression('')
        setDataType('DOUBLE')
      }
    }
  }, [isOpen, initialMetric])

  // Compute available columns grouped by source
  const columnGroups = useMemo(() => {
    const groups: {
      title: string
      icon: typeof Database
      columns: { name: string; type: string; source: string }[]
    }[] = []

    // 1. Native Columns
    groups.push({
      title: 'Current Table',
      icon: Database,
      columns: file.columns.map(col => ({
        name: col.name,
        type: col.type,
        source: file.tableName,
      })),
    })

    // 2. Joined Columns
    const relevantRelations = relations.filter(r => r.fileAId === file.id)
    relevantRelations.forEach(rel => {
      const targetFile = files.find(f => f.id === rel.fileBId)
      if (targetFile) {
        const prefix = rel.columnA
        groups.push({
          title: `Linked via ${prefix}`,
          icon: Link2,
          columns: targetFile.columns.map(col => ({
            name: getJoinedColumnName(prefix, col.name),
            type: col.type,
            source: targetFile.tableName,
          })),
        })
      }
    })

    return groups
  }, [file, files, relations])

  const handleSave = () => {
    if (!name || !expression) return

    const newMetric: SmartMetric = {
      id: initialMetric?.id || crypto.randomUUID(),
      name,
      label: label || name,
      sqlExpression: expression,
      dataType,
    }

    onSave(newMetric)
    onClose()
  }

  const insertColumn = (colName: string) => {
    setExpression(prev => `${prev} "${colName}"`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            {initialMetric ? 'Edit Smart Metric' : 'Add Smart Metric'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left: Form */}
          <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metric Name (SQL Alias)</Label>
                <Input
                  placeholder="e.g. profit_margin"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-zinc-500">
                  Used in SQL queries. No spaces.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Display Label</Label>
                <Input
                  placeholder="e.g. Profit Margin %"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <Label>SQL Expression</Label>
              <div className="relative flex-1">
                <Textarea
                  placeholder={`e.g. "amount" - "product_id__cost"`}
                  value={expression}
                  onChange={e => setExpression(e.target.value)}
                  className="font-mono text-sm h-full min-h-[200px] bg-zinc-50 resize-none p-4 leading-relaxed"
                />
              </div>
              <p className="text-xs text-zinc-500">
                DuckDB SQL syntax supported. Click columns on the right to insert.
              </p>
            </div>
          </div>

          {/* Right: Available Columns */}
          <div className="w-64 border-l bg-zinc-50 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-100/50">
              Available Columns
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {columnGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <group.icon className="w-3 h-3" />
                    {group.title}
                  </div>
                  {group.columns.map(col => (
                    <button
                      key={col.name}
                      onClick={() => insertColumn(col.name)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-200 group transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-700 truncate flex-1">
                          {col.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 pl-0 truncate">
                        {col.type}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-zinc-50 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !expression}>
            Save Metric
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}