import { useFileStore } from '../stores/useFileStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useSqlLabStore } from '../stores/useSqlLabStore'
import { ColumnType, ColumnSchema } from '@shared/types'
import { getUIFormatType, UIFormatType as FormatType } from '@shared/type-utils'
import {
  AlignJustify,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Code,
  Database,
  Edit2,
  Eye,
  FileInput,
  FileSpreadsheet,
  Hash,
  Key,
  Link2,
  MoreVertical,
  RefreshCw,
  ToggleLeft,
  Trash2,
  Type,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToastStore } from '../stores/useToastStore'
import { useReIngestFile } from '../hooks/useIPC'
import { useState } from 'react'
import { Input } from './ui/input'
import { cn } from '@/utils/cn'
import { ExpandableAction } from './ui/expandable-action'
import { ConfirmDialog } from './modals/ConfirmDialog'

interface FormatConfig {
  label: string
  icon: typeof Hash
  bgColor: string
  textColor: string
}

const FORMAT_CONFIG: Record<FormatType, FormatConfig> = {
  number: {
    label: 'format_number',
    icon: Hash,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  text: {
    label: 'format_text',
    icon: Type,
    bgColor: 'bg-zinc-100',
    textColor: 'text-zinc-600',
  },
  date: {
    label: 'format_date',
    icon: Calendar,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  timestamp: {
    label: 'format_datetime',
    icon: Clock,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
}

export function SchemaEditor() {
  const { files, toggleKeyColumn, relations } = useFileStore()
  const activeFileId = useProjectStore(s => s.activeFileId)
  const openSqlLab = useSqlLabStore(s => s.open)
  const replaceFile = useProjectStore(s => s.replaceFile)
  const removeFile = useProjectStore(s => s.removeFile)
  const { t } = useTranslation('common')
  const toast = useToastStore()
  const reIngest = useReIngestFile()
  const readyFiles = files.filter(f => f.status === 'ready')

  // 如果没有 ready 的文件，不显示
  if (readyFiles.length === 0) return null

  // 确保有选中的文件
  const currentFileId =
    activeFileId && readyFiles.find(f => f.id === activeFileId)
      ? activeFileId
      : readyFiles[0]?.id

  const currentFile = readyFiles.find(f => f.id === currentFileId)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // --- Handlers ---
  const handlePreview = () => {
    if (!currentFile) return
    openSqlLab({
      mode: 'file',
      targetId: currentFile.name,
      targetTitle: currentFile.name,
      initialSql: `SELECT * FROM "${currentFile.tableName}" LIMIT 100`,
    })
  }

  const handleReload = async () => {
    if (!currentFile) return

    await toast.promise(
      async () => {
        const result = await reIngest.mutateAsync({
          filePath: currentFile.path,
          tableName: currentFile.tableName,
          sheetName: currentFile.sheetName,
        })
        useFileStore.getState().reloadFile(currentFile.id, result)
      },
      {
        loading: t('reloading'),
        success: t('reload_success'),
        error: (e) => `${t('reload_failed')}: ${String(e)}`
      }
    )
  }

  const handleReplace = async () => {
    if (!currentFile || !window.electronAPI) return
    const result = await window.electronAPI.selectFile()
    if (result.success && result.data) {
      await toast.promise(
        async () => {
          const status = await replaceFile(currentFile.id, result.data)
          if (status !== 'completed') {
             throw new Error(t('replace_failed'))
          }
        },
        {
          loading: t('replacing_file'),
          success: t('file_replaced'),
          error: (e) => `${t('replace_failed')}: ${String(e)}`
        }
      )
    }
  }

  const handleDelete = () => {
    if (!currentFile) return
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (!currentFile) return
    removeFile(currentFile.id)
    toast.addToast({
      title: t('file_removed'),
      type: 'success',
      duration: 2000,
    })
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* 可滚动内容 */}
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-32">
        {/* 当前文件的 Schema 表格 */}
        {currentFile && (
          <div className="flex flex-col min-h-0">
            {/* New Modern Header */}
            <div className="px-8 py-6 border-b border-zinc-100 bg-white shrink-0 relative">
              <div className="flex flex-col gap-3 min-w-0">
                {/* Row 1: Icon + Filename */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-green-50 rounded-lg border border-green-100 shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight truncate whitespace-nowrap">
                    {currentFile.name}
                  </h2>
                </div>

                {/* Row 2: Metadata Strip */}
                <div className="flex items-center flex-wrap gap-4 text-sm text-zinc-500 pl-1">
                  {/* Table Name (Technical Info) */}
                  <div
                    className="flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                    title="SQL Table Name"
                  >
                    <Database className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-mono text-xs bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-700 select-all">
                      {currentFile.tableName}
                    </span>
                  </div>

                  <div className="w-px h-3 bg-zinc-200 shrink-0" />

                  {/* Stats */}
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    <AlignJustify className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {currentFile.rowCount?.toLocaleString() ?? 0} {t('rows')}
                    </span>
                    <span>·</span>
                    <span>
                      {currentFile.columns.length} {t('field_name')}
                    </span>
                  </div>

                  <div className="w-px h-3 bg-zinc-200 shrink-0" />

                  {/* Time */}
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs">
                      {t('last_updated')}:{' '}
                      {new Date(currentFile.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="absolute top-6 right-4 flex items-center gap-2 p-1 bg-white/80 backdrop-blur border border-zinc-200 rounded-lg shadow-sm hover:shadow transition-shadow">
                <ExpandableAction
                  icon={<RefreshCw className="w-4 h-4" />}
                  label={t('reload_data')}
                  onClick={handleReload}
                />

                <ExpandableAction
                  icon={<FileInput className="w-4 h-4" />}
                  label={t('replace_source')}
                  onClick={handleReplace}
                />

                <ExpandableAction
                  icon={<Trash2 className="w-4 h-4" />}
                  label={t('remove_file')}
                  onClick={handleDelete}
                  className="hover:text-red-600 hover:bg-red-50"
                />
              </div>
            </div>

            {/* 列表格 */}
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-[40px] z-30 bg-white shadow-sm">
                <tr className="text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-white">
                  <th className="px-6 py-3 w-1/3 border-b">
                    {t('field_name')}
                  </th>
                  <th className="px-6 py-3 w-1/4 border-b">{t('format')}</th>
                  <th className="px-6 py-3 border-b">{t('preview')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {currentFile.columns.map(col => (
                  <ColumnRow
                    key={col.name}
                    fileId={currentFile.id}
                    column={col}
                    onToggleKey={() =>
                      toggleKeyColumn(currentFile.id, col.name)
                    }
                    isLinked={relations.some(
                      r =>
                        (r.fileAId === currentFile.id &&
                          r.columnA === col.name) ||
                        (r.fileBId === currentFile.id && r.columnB === col.name)
                    )}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('remove_file')}
        description={t('delete_session_desc')}
        onConfirm={confirmDelete}
        variant="destructive"
        confirmText={t('remove_file')}
        cancelText={t('cancel')}
      />
    </div>
  )
}

// 列行组件
interface ColumnRowProps {
  fileId: string
  column: ColumnSchema
  onToggleKey: () => void
  isLinked: boolean
}

function ColumnRow({ fileId, column, onToggleKey, isLinked }: ColumnRowProps) {
  const formatType = getUIFormatType(column.type)
  const config = FORMAT_CONFIG[formatType]
  const IconComponent = config.icon
  const { t } = useTranslation('common')
  const { updateColumn } = useFileStore()

  const [isRenaming, setIsRenaming] = useState(false)
  const [alias, setAlias] = useState(column.alias || column.name)

  const submitRename = () => {
    if (alias.trim() && alias !== (column.alias || column.name)) {
      updateColumn(fileId, column.name, { alias: alias.trim() })
    }
    setIsRenaming(false)
  }

  const handleTypeChange = (newType: string) => {
    updateColumn(fileId, column.name, { type: newType as ColumnType })
  }

  return (
    <tr className="hover:bg-zinc-50 transition-colors group">
      {/* Field Name - 包含 Key 图标 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Key 图标按钮 */}
          <button
            onClick={onToggleKey}
            className={`mr-1 cursor-pointer transition-colors p-1 rounded hover:bg-zinc-100 flex items-center justify-center ${
              column.isKey ? 'text-indigo-500' : 'text-zinc-300'
            }`}
            title={column.isKey ? t('unset_key') : t('set_key')}
          >
            <Key className="w-3 h-3" />
          </button>

          {/* 字段名 */}
          <div className="flex items-center gap-2 flex-1 min-w-0 group/name">
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  autoFocus
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitRename()
                    if (e.key === 'Escape') {
                      setAlias(column.alias || column.name)
                      setIsRenaming(false)
                    }
                  }}
                  className="h-7 text-sm py-0 px-2"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-600 shrink-0"
                  onClick={submitRename}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <span
                  className={cn(
                    'text-sm truncate',
                    column.alias ? 'text-zinc-900 font-medium' : 'text-zinc-600'
                  )}
                >
                  {column.alias || column.name}
                </span>
                {column.alias && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    ({column.name})
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0"
                  onClick={() => setIsRenaming(true)}
                >
                  <Edit2 className="w-3 h-3 text-zinc-400" />
                </Button>
              </>
            )}
          </div>

          {/* 已关联标记 */}
          {isLinked && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              <Link2 className="w-3 h-3" />
              {/*已关联*/}
            </span>
          )}
        </div>
      </td>

      {/* Format - 可点击切换的 Badge */}
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity',
                config.bgColor,
                config.textColor
              )}
            >
              <IconComponent className="w-3.5 h-3.5" />
              {t(config.label)}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            <DropdownMenuItem onClick={() => handleTypeChange('VARCHAR')}>
              <Type className="w-4 h-4 mr-2" /> {t('format_text')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('DOUBLE')}>
              <Hash className="w-4 h-4 mr-2" /> {t('format_number')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('DATE')}>
              <Calendar className="w-4 h-4 mr-2" /> {t('format_date')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('TIMESTAMP')}>
              <Clock className="w-4 h-4 mr-2" /> {t('format_datetime')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('BOOLEAN')}>
              <ToggleLeft className="w-4 h-4 mr-2" /> {t('type_boolean')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>

      {/* Preview */}
      <td className="px-4 py-3">
        {Array.isArray(column.sampleValues) &&
        column.sampleValues.length > 0 ? (
          <div className="flex gap-1 flex-wrap text-xs text-muted-foreground">
            {column.sampleValues.map((val, i) => {
              return (
                <span
                  key={i}
                  className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] border text-zinc-600 max-w-[120px] truncate inline-block align-middle"
                  title={String(val)}
                >
                  {String(val)}
                </span>
              )
            })}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground text-zinc-400 opacity-30 italic">
            {t('no_preview')}
          </span>
        )}
      </td>
    </tr>
  )
}
