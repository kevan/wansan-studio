import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReportTable } from '../report/report-table'
import { useProjectStore } from '@/stores/useProjectStore'

export function DataPreviewModal() {
  const previewFileId = useProjectStore(state => state.previewFileId)
  const setPreviewFileId = useProjectStore(state => state.setPreviewFileId)
  const files = useProjectStore(state => state.files)
  const file = files.find(f => f.id === previewFileId)

  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!file) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch first 100 rows for preview
        const res = await window.electronAPI.runSQL(
          `SELECT * FROM "${file.tableName}" LIMIT 100`
        )
        if (res.success && res.data) {
          setData(res.data)
          if (res.data.length > 0) {
            setColumns(Object.keys(res.data[0]))
          } else {
             // Fallback to schema if empty
             setColumns(file.columns.map(c => c.name))
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [file])

  if (!file) return null

  return (
    <Dialog open={!!previewFileId} onOpenChange={() => setPreviewFileId(null)}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview: {file.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden border rounded-md">
          {loading ? (
            <div className="p-4">Loading...</div>
          ) : (
            <ReportTable
              data={data}
              columns={columns}
              variant="dashboard" // Reuse dashboard style (paginated/scrollable)
            />
          )}
        </div>
        <div className="text-xs text-zinc-400 p-2">Showing first 100 rows.</div>
      </DialogContent>
    </Dialog>
  )
}
