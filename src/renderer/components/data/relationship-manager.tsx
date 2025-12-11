import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link2, Trash2 } from 'lucide-react'
import { useFileStore } from '../../stores/useFileStore'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface RelationFormState {
  sourceFileId: string
  sourceColumn: string
  targetFileId: string
  targetColumn: string
}

export function RelationshipManager() {
  const { files, relations, addRelation, removeRelation } = useFileStore()
  const readyFiles = useMemo(
    () => files.filter(file => file.status === 'ready'),
    [files]
  )
  const [form, setForm] = useState<RelationFormState>({
    sourceFileId: readyFiles[0]?.id ?? '',
    sourceColumn: '',
    targetFileId: readyFiles[1]?.id ?? readyFiles[0]?.id ?? '',
    targetColumn: '',
  })

  const getFileName = useCallback(
    (id: string | undefined) =>
      readyFiles.find(file => file.id === id)?.name || 'Select table',
    [readyFiles]
  )

  const getColumns = useCallback(
    (fileId: string | undefined) =>
      readyFiles.find(file => file.id === fileId)?.columns ?? [],
    [readyFiles]
  )

  useEffect(() => {
    setForm(prev => {
      const sourceFileId = readyFiles.some(f => f.id === prev.sourceFileId)
        ? prev.sourceFileId
        : readyFiles[0]?.id ?? ''

      const targetFallback =
        readyFiles.find(f => f.id !== sourceFileId)?.id ?? sourceFileId
      const targetFileId = readyFiles.some(f => f.id === prev.targetFileId)
        ? prev.targetFileId
        : targetFallback

      const sourceColumnValid = getColumns(sourceFileId).some(
        c => c.name === prev.sourceColumn
      )
      const targetColumnValid = getColumns(targetFileId).some(
        c => c.name === prev.targetColumn
      )

      return {
        sourceFileId,
        targetFileId,
        sourceColumn: sourceColumnValid ? prev.sourceColumn : '',
        targetColumn: targetColumnValid ? prev.targetColumn : '',
      }
    })
  }, [getColumns, readyFiles])

  const handleLink = () => {
    if (!form.sourceFileId || !form.targetFileId || !form.sourceColumn || !form.targetColumn) {
      return
    }

    addRelation({
      fileAId: form.sourceFileId,
      columnA: form.sourceColumn,
      fileBId: form.targetFileId,
      columnB: form.targetColumn,
    })
  }

  const canSubmit =
    !!form.sourceFileId &&
    !!form.targetFileId &&
    !!form.sourceColumn &&
    !!form.targetColumn

  if (readyFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 bg-white">
        Import data sources to define relationships.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto min-h-0 p-6 pb-32 space-y-6">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-zinc-500 tracking-wide">
              Existing Links
            </h3>
          </div>
          {relations.length === 0 ? (
            <div className="border border-dashed border-zinc-200 rounded-lg p-4 text-sm text-zinc-500">
              No relationships yet. Create one below.
            </div>
          ) : (
            <div className="space-y-2">
              {relations.map(rel => {
                const sourceFile = readyFiles.find(f => f.id === rel.fileAId)
                const targetFile = readyFiles.find(f => f.id === rel.fileBId)

                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-sm text-zinc-700">
                      <span className="font-semibold">
                        {sourceFile?.tableName || sourceFile?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-zinc-400">({rel.columnA})</span>
                      <Link2 className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold">
                        {targetFile?.tableName || targetFile?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-zinc-400">({rel.columnB})</span>
                    </div>
                    <button
                      onClick={() => removeRelation(rel.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="p-6 bg-zinc-50 border-t mt-auto rounded-lg">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
            Add New Link
          </h3>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Source Table</label>
                <Select
                  value={form.sourceFileId}
                  onValueChange={value =>
                    setForm(prev => ({
                      ...prev,
                      sourceFileId: value,
                      sourceColumn: '',
                    }))
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <span className="truncate">
                      {form.sourceFileId
                        ? getFileName(form.sourceFileId)
                        : 'Select table'}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {readyFiles.map(file => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.tableName || file.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Join Column</label>
                <Select
                  value={form.sourceColumn}
                  onValueChange={value =>
                    setForm(prev => ({ ...prev, sourceColumn: value }))
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {getColumns(form.sourceFileId).map(col => (
                      <SelectItem key={col.name} value={col.name}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white p-1 rounded-full border shadow-sm text-indigo-500">
                <Link2 className="h-4 w-4" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Target Table</label>
                <Select
                  value={form.targetFileId}
                  onValueChange={value =>
                    setForm(prev => ({
                      ...prev,
                      targetFileId: value,
                      targetColumn: '',
                    }))
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <span className="truncate">
                      {form.targetFileId
                        ? getFileName(form.targetFileId)
                        : 'Select table'}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {readyFiles.map(file => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.tableName || file.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Join Column</label>
                <Select
                  value={form.targetColumn}
                  onValueChange={value =>
                    setForm(prev => ({ ...prev, targetColumn: value }))
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {getColumns(form.targetFileId).map(col => (
                      <SelectItem key={col.name} value={col.name}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleLink}
              disabled={!canSubmit}
              className="w-full mt-4 bg-black hover:bg-zinc-800 text-white"
            >
              Link Tables
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
