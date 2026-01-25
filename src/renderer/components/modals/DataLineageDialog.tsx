import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Database,
  FileSpreadsheet,
  FolderOpen,
  History,
  Server,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FileNode } from '@shared/types'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileNode
}

export function DataLineageDialog({ open, onOpenChange, file }: Props) {
  const { t } = useTranslation('common')
  const dbConnections = useSettingsStore(s => s.dbConnections)
  
  const connectionId =
    file.source.type === 'database' ? file.source.connectionId : null
  const connection = connectionId
    ? dbConnections.find(c => c.id === connectionId)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl p-0 overflow-hidden text-zinc-900">
        <div className="p-8 bg-zinc-50/50 border-b border-zinc-100">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            {t('data_lineage')}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            {t('data_lineage_desc')}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {file.source.type === 'database' && connection ? (
            /* DB Source Details */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
                  <Server className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-indigo-900 truncate">
                    {connection.name}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 truncate">
                    {connection.type.toUpperCase()} · {connection.host}:
                    {connection.port}
                  </span>
                </div>
              </div>
                              <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white border border-zinc-100 rounded-2xl">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">
                                  {t('original_database')}
                                </Label>
                                <span className="text-sm font-bold font-mono truncate block">
                                  {connection.database || t('no_data')}
                                </span>
                              </div>
                              <div className="p-4 bg-white border border-zinc-100 rounded-2xl">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">
                                  {t('source_table_raw')}
                                </Label>
                                <span className="text-sm font-bold font-mono truncate block">
                                  {file.source.schema ? `${file.source.schema}.${file.source.table}` : file.source.table}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : file.source.type === 'local_file' ? (
                          /* File Source Details */
                          <div className="space-y-4">
                            <div className="p-4 bg-white border border-zinc-100 rounded-2xl space-y-3">
                              <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block">
                                {t('physical_path')}
                              </Label>
                              <div className="flex items-start gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100 group">
                                <div className="p-2 bg-white rounded-lg border border-zinc-200 shrink-0 mt-0.5">
                                  <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
                                </div>
                                <div className="flex-1 min-w-0 py-1.5">
                                  <p className="text-xs font-mono text-zinc-600 break-all leading-relaxed">
                                    {file.source.path}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    file.source.type === 'local_file' &&
                                    window.electronAPI.showItemInFolder(file.source.path)
                                  }
                                  title={t('show_in_folder')}
                                  className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 shadow-none shrink-0 mt-0.5"
                                >
                                  <FolderOpen className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
              {file.source.subResource && (
                <div className="p-4 bg-white border border-zinc-100 rounded-2xl">
                  <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2">
                    {t('worksheet_entity')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-sm font-bold text-zinc-900 truncate">
                      {file.source.subResource}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-8 bg-zinc-900 hover:bg-black text-white font-bold"
          >
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
