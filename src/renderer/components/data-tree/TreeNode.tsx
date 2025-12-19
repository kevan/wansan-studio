import { NodeApi } from 'react-arborist'
import { TreeNodeData } from './tree-utils'
import {
  FolderClosed,
  FolderOpen,
  FileSpreadsheet,
  FileJson,
  FileText,
  Link2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  ChevronRight,
  ChevronDown,
  Database,
  Trash2,
  Eye,
  Pencil,
  RefreshCw,
  X,
  AlertCircle,
  FileWarning,
} from 'lucide-react'
import { MouseEvent } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../ui/context-menu'
import { useFileStore } from '../../stores/useFileStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useToastStore } from '../../stores/useToastStore'
import { useReIngestFile } from '../../hooks/useIPC'
import { useTranslation } from 'react-i18next'

interface TreeNodeProps {
  node: NodeApi<TreeNodeData>
  style: React.CSSProperties
  dragHandle?: (el: HTMLDivElement | null) => void
}

export function TreeNode({ node, style, dragHandle }: TreeNodeProps) {
  const data = node.data
  const isSelected = node.isSelected
  const {
    removeFile,
    removeRelation,
    updateColumn,
    files,
  } = useFileStore()
  const replaceFile = useProjectStore(state => state.replaceFile)
  const setActiveFile = useProjectStore(state => state.setActiveFile)
  const setPreviewFileId = useProjectStore(state => state.setPreviewFileId)
  const setView = useProjectStore(state => state.setView)
  const { addToast } = useToastStore()
  const reIngest = useReIngestFile()
  const { t } = useTranslation('common')

  // --- Icon Logic ---
  const getIcon = () => {
    if (data.type === 'folder') {
      return node.isOpen ? (
        <FolderOpen className="w-4 h-4 text-zinc-400" />
      ) : (
        <FolderClosed className="w-4 h-4 text-zinc-400" />
      )
    }

    if (data.type === 'file') {
      return getFileIcon()
    }

    if (data.type === 'relation') {
      return <Link2 className="w-4 h-4 text-indigo-500" />
    }

    if (data.type === 'column') {
      const type = data.columnType?.toUpperCase() || 'VARCHAR'

      if (
        [
          'DOUBLE',
          'BIGINT',
          'INT',
          'INTEGER',
          'DECIMAL',
          'FLOAT',
          'HUGEINT',
          'TINYINT',
          'SMALLINT',
        ].some(t => type.includes(t))
      ) {
        return <Hash className="w-3.5 h-3.5 text-blue-600" />
      }

      if (['DATE', 'TIMESTAMP', 'TIME'].some(t => type.includes(t))) {
        return <Calendar className="w-3.5 h-3.5 text-emerald-600" />
      }

      if (['BOOLEAN', 'BOOL'].includes(type)) {
        return <ToggleLeft className="w-3.5 h-3.5 text-purple-600" />
      }

      // Default to Text/VARCHAR
      return <Type className="w-3.5 h-3.5 text-zinc-500" />
    }

    return <Database className="w-4 h-4 text-zinc-400" />
  }

  // --- Actions ---
  const handleRemoveFile = () => {
    if (data.fileId) {
      removeFile(data.fileId)
      addToast({ title: t('file_removed'), type: 'success', duration: 2000 })
    }
  }

  const handlePreviewFile = () => {
    if (data.fileId) {
      setPreviewFileId(data.fileId)
    }
  }

  const handleRemoveRelation = () => {
    if (data.relationId) {
      removeRelation(data.relationId)
      addToast({
        title: t('relationship_removed'),
        type: 'success',
        duration: 2000,
      })
    }
  }

  const handleColumnTypeChange = (
    newType: 'VARCHAR' | 'DOUBLE' | 'DATE' | 'BOOLEAN'
  ) => {
    if (data.fileId && data.columnName) {
      updateColumn(data.fileId, data.columnName, { type: newType })
      addToast({
        title: t('type_changed', { type: newType }),
        type: 'success',
        duration: 2000,
      })
    }
  }

  const handleRenameAlias = () => {
    // Placeholder for rename logic
    addToast({
      title: t('rename_feature'),
      description: t('coming_soon'),
      type: 'info',
      duration: 2000,
    })
  }

  const handleReplaceFile = async () => {
    if (!data.fileId) return
    if (!window.electronAPI) return

    const result = await window.electronAPI.selectFile()
    if (result.success && result.data && typeof result.data === 'string') {
        const loadingToast = addToast({ title: t('replacing_file'), type: 'info', duration: 0 })
        try {
            const status = await replaceFile(data.fileId, result.data)
            if (status === 'completed') {
                addToast({ title: t('file_replaced'), type: 'success', duration: 2000 })
            } else if (status === 'error') {
                addToast({ title: t('replace_failed'), type: 'error' })
            }
        } catch (e) {
            addToast({ title: t('replace_failed'), description: String(e), type: 'error' })
        } finally {
            // Dismiss loading toast if possible, or let it timeout? 
            // Current toast store doesn't support dismiss by ID easily.
        }
    }
  }

  const handleReload = async () => {
    if (!data.fileId) return
    const file = files.find(f => f.id === data.fileId)
    if (!file) return

    // Dismiss any existing persistent toast? We don't have IDs easily.
    // Just add new ones.
    const toastId = addToast({
      title: t('reloading'),
      type: 'info',
      duration: 0,
    })

    try {
      const result = await reIngest.mutateAsync({
        filePath: file.path,
        tableName: file.tableName,
        sheetName: file.sheetName,
      })
      // result is ReloadResult { lastModified, newColumns }

      // Call store action
      // We need to access the store action. It's not destructured above.
      // Let's grab it from the store hook.
      const droppedCount = useFileStore.getState().reloadFile(file.id, result)

      addToast({
        title: t('reload_success'),
        type: 'success',
        duration: 2000,
      })

      if (droppedCount > 0) {
        addToast({
          title: t('warning'),
          description: t('reload_warning', { count: droppedCount }),
          type: 'warning',
          duration: 5000,
        })
      }
    } catch (e) {
      addToast({
        title: t('reload_failed'),
        description: String(e),
        type: 'error',
        duration: 3000,
      })
    }
  }

  const getFileIcon = () => {
    if (data.type === 'file' && data.fileId) {
      const file = files.find(f => f.id === data.fileId)
      if (file) {
        const extension = file.name.toLowerCase()
        if (extension.endsWith('.json')) {
          return <FileJson className="w-4 h-4 text-orange-500" />
        } else if (extension.endsWith('.csv')) {
          return <FileText className="w-4 h-4 text-blue-500" />
        }
      }
    }
    return <FileSpreadsheet className="w-4 h-4 text-green-600" />
  }

  // --- Interaction ---
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    node.select()
    // node.edit()
  }

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation()
    node.toggle()
  }

  // --- Styles ---
  const containerClass = `
    flex items-center w-full h-full cursor-pointer select-none text-sm pr-2 outline-none
    ${isSelected ? 'bg-zinc-100 text-zinc-900 border-l-2 border-zinc-900' : 'text-zinc-600 border-l-2 border-transparent hover:bg-zinc-50'}
  `
    .replace(/\s+/g, ' ')
    .trim()

  const isMissing = data.type === 'file' && data.status === 'missing'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          style={style}
          className={containerClass}
          onClick={handleClick}
          ref={dragHandle}
        >
          {/* Indentation / Arrow */}
          <div
            className="flex items-center justify-center w-6 shrink-0"
            onClick={handleToggle}
          >
            {!node.isLeaf &&
              (node.isOpen ? (
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-400" />
              ))}
          </div>

          {/* Icon */}
          <div className="flex items-center justify-center w-5 shrink-0 mr-1 relative">
            {isMissing ? (
              <FileWarning className="w-4 h-4 text-red-400" />
            ) : (
              getIcon()
            )}
            {!isMissing &&
              data.type === 'file' &&
              data.status === 'out-of-sync' && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full">
                  <AlertCircle className="w-2.5 h-2.5 text-amber-500 fill-white" />
                </div>
              )}
          </div>

          {/* Label */}
          <span
            className={`truncate flex-1 ${isMissing ? 'line-through text-red-400 opacity-80' : ''}`}
            title={isMissing ? t('file_missing_tooltip') : undefined}
          >
            {data.name}
          </span>

          {/* Badges / Indicators */}
          {data.isKey && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded ml-1 border border-amber-200">
              PK
            </span>
          )}
          {data.isForeignKey && (
            <span className="ml-1" title={t('part_of_relationship')}>
              <Link2 className="w-3 h-3 text-indigo-400" />
            </span>
          )}
        </div>
      </ContextMenuTrigger>

      {/* Menu Content */}
      <ContextMenuContent className="w-48">
        {data.type === 'file' && (
          <>
            <ContextMenuItem onClick={handlePreviewFile}>
              <Eye className="w-4 h-4 mr-2" />
              {t('preview_data')}
            </ContextMenuItem>
            <ContextMenuItem onClick={handleReplaceFile}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('replace_data_source')}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={handleReload}
              disabled={reIngest.isPending}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${reIngest.isPending ? 'animate-spin' : ''}`}
              />
              {t('reload_data')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={handleRemoveFile}
              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('remove_file')}
            </ContextMenuItem>
          </>
        )}

        {data.type === 'column' && (
          <>
            <ContextMenuItem onClick={handleRenameAlias}>
              <Pencil className="w-4 h-4 mr-2" />
              {t('rename_alias')}
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('change_type')}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-32">
                <ContextMenuItem
                  onClick={() => handleColumnTypeChange('VARCHAR')}
                >
                  <Type className="w-4 h-4 mr-2" /> {t('format_text')}
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => handleColumnTypeChange('DOUBLE')}
                >
                  <Hash className="w-4 h-4 mr-2" /> {t('format_number')}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleColumnTypeChange('DATE')}>
                  <Calendar className="w-4 h-4 mr-2" /> {t('format_date')}
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => handleColumnTypeChange('BOOLEAN')}
                >
                  <ToggleLeft className="w-4 h-4 mr-2" /> {t('type_boolean')}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {data.type === 'relation' && (
          <ContextMenuItem
            onClick={handleRemoveRelation}
            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
          >
            <X className="w-4 h-4 mr-2" />
            {t('delete_relationship')}
          </ContextMenuItem>
        )}

        {data.type === 'folder' && (
          <ContextMenuItem disabled className="text-zinc-400">
            {t('folder_actions_na')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
