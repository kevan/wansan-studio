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
import { Label } from '../ui/label'
import { FileNode, SmartMetric } from '@shared/types'
import { useProjectStore } from '../../stores/useProjectStore'
import {
  Calculator,
  Database,
  Link2,
  Check,
  AlertCircle,
  Play,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { getJoinedColumnName } from '@shared/naming-utils'
import { DuckDBViewManager } from '../../lib/duckdb-view-manager'

// Code Editor
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-sql'
import 'prismjs/themes/prism.css'

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

  // Test Run State
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

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
      setTestResult(null)
      setTestError(null)
    }
  }, [isOpen, initialMetric])

  // Clear test feedback when expression changes
  useEffect(() => {
    setTestResult(null)
    setTestError(null)
  }, [expression])

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

  const validateAndSave = async () => {
    if (!name || !expression) return

    setIsTesting(true)
    setTestError(null)

    try {
      // Run validation before saving
      const result = await DuckDBViewManager.testMetricExpression(
        file,
        expression,
        files,
        relations
      )

      // If valid, apply data type and save
      const finalDataType = result.dataType || 'DOUBLE'
      const newMetric: SmartMetric = {
        id: initialMetric?.id || crypto.randomUUID(),
        name,
        label: label || name,
        sqlExpression: expression,
        dataType: finalDataType,
      }

      await onSave(newMetric)
      onClose()
    } catch (e: any) {
      setTestError(e.message || 'Validation failed')
    } finally {
      setIsTesting(false)
    }
  }

  const handleManualTest = async () => {
    if (!expression) return
    setIsTesting(true)
    setTestResult(null)
    setTestError(null)

    try {
      const result = await DuckDBViewManager.testMetricExpression(
        file,
        expression,
        files,
        relations
      )

      if (result.value !== undefined) {
        setTestResult(String(result.value ?? '(null)'))
        setDataType(result.dataType)
      } else {
        setTestResult('(No rows returned)')
      }
    } catch (e: any) {
      setTestError(e.message || 'Syntax Error')
    } finally {
      setIsTesting(false)
    }
  }

  const insertAtCursor = (text: string) => {
    const textarea = document.getElementById(
      'metric-sql-editor'
    ) as HTMLTextAreaElement
    
    const textToInsert = `"${text}"`
    
    if (!textarea) {
      setExpression(prev => prev + textToInsert)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = expression

    const newVal =
      currentVal.substring(0, start) + textToInsert + currentVal.substring(end)

    setExpression(newVal)

    // Set focus and cursor position after state update
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + textToInsert.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-white">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            {initialMetric ? 'Edit Smart Metric' : 'Add Smart Metric'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 bg-zinc-50/30">
          {/* Left: Form & Editor */}
          <div className="flex-1 flex flex-col min-w-0 bg-white shadow-sm">
            <div className="p-6 pb-0 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase">Metric Name (SQL Alias)</Label>
                  <Input
                    placeholder="e.g. profit_margin"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="font-mono bg-zinc-50 border-zinc-200"
                  />
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Identifier for SQL queries. Use lowercase and underscores.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase">Display Label</Label>
                  <Input
                    placeholder="e.g. Profit Margin %"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    className="bg-zinc-50 border-zinc-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col min-h-0 gap-2">
              <Label className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase">
                <span>SQL Expression</span>
                <span className="text-[10px] text-zinc-400 font-normal normal-case">DuckDB Syntax Supported</span>
              </Label>

              <div className="flex-1 border border-zinc-200 rounded-lg bg-zinc-50 font-mono text-sm overflow-hidden relative flex flex-col focus-within:border-purple-300 transition-colors shadow-inner">
                <div className="flex-1 overflow-auto relative">
                  <Editor
                    value={expression}
                    onValueChange={setExpression}
                    highlight={code => highlight(code, languages.sql, 'sql')}
                    padding={16}
                    textareaId="metric-sql-editor"
                    style={{
                      fontFamily: '"Fira Code", "Fira Mono", monospace',
                      fontSize: 14,
                      minHeight: '100%',
                    }}
                    textareaClassName="focus:outline-none"
                  />
                </div>
              </div>

              {/* Test Runner Bar */}
              <div className="flex items-center justify-between bg-zinc-50/80 p-3 rounded-lg border border-zinc-200 mt-2 shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualTest}
                    disabled={isTesting || !expression}
                    className="h-8 gap-2 bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 shadow-sm"
                  >
                    {isTesting ? (
                      <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 fill-current text-zinc-400" />
                    )}
                    Quick Test
                  </Button>

                  {testResult !== null && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-2.5 py-1 rounded border border-green-100 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span className="font-mono font-bold tracking-tight">{testResult}</span>
                      <span className="text-[10px] uppercase font-bold opacity-50 px-1 border-l border-green-200">{dataType}</span>
                    </div>
                  )}

                  {testError && (
                    <div
                      className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded border border-red-100 max-w-lg shadow-sm"
                      title={testError}
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-medium">{testError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Available Columns Sidebar */}
          <div className="w-72 border-l border-zinc-200 bg-zinc-50/50 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Field Assistant
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-6">
              {columnGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <group.icon className="w-3 h-3" />
                    {group.title}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {group.columns.map(col => (
                      <button
                        key={col.name}
                        onClick={() => insertAtCursor(col.name)}
                        className="group flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-200 transition-all text-xs"
                      >
                        <span
                          className="font-mono text-zinc-600 truncate mr-2"
                          title={col.name}
                        >
                          {col.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                          {col.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-zinc-200 bg-white shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={isTesting} className="text-zinc-500">
            Cancel
          </Button>
          <Button
            onClick={validateAndSave}
            disabled={!name || !expression || isTesting}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 min-w-[140px] shadow-md shadow-purple-100"
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Save Metric
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
