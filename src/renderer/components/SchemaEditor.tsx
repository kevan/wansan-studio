import { ColumnSchema, useFileStore } from '../stores/useFileStore'
import { Hash, Type, Calendar, Key, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// 类型映射配置
type FormatType = 'number' | 'text' | 'date'

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
}

// 将技术类型映射到业务类型
function mapToFormatType(type: string): FormatType {
  const lowerType = type.toLowerCase()
  if (
    lowerType.includes('int') ||
    lowerType.includes('decimal') ||
    lowerType.includes('double') ||
    lowerType.includes('float') ||
    lowerType.includes('bigint') ||
    lowerType.includes('number') ||
    lowerType.includes('numeric')
  ) {
    return 'number'
  }
  if (
    lowerType.includes('date') ||
    lowerType.includes('time') ||
    lowerType.includes('timestamp')
  ) {
    return 'date'
  }
  return 'text'
}

export function SchemaEditor() {
  const { files, activeFileId, toggleKeyColumn, relations } = useFileStore()
  const { t } = useTranslation('common')
  const readyFiles = files.filter(f => f.status === 'ready')

  // 如果没有 ready 的文件，不显示
  if (readyFiles.length === 0) return null

  // 确保有选中的文件
  const currentFileId =
    activeFileId && readyFiles.find(f => f.id === activeFileId)
      ? activeFileId
      : readyFiles[0]?.id

  const currentFile = readyFiles.find(f => f.id === currentFileId)

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* 可滚动内容 */}
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-32">
        {/* 当前文件的 Schema 表格 */}
        {currentFile && (
          <div className="flex flex-col min-h-0">
            <div className="sticky top-0 z-30 bg-zinc-50/95 backdrop-blur border-b px-6 py-2 flex items-center justify-between text-xs text-zinc-600">
              <div className="flex items-center gap-3">
                <span className="font-medium text-zinc-900">
                  {t('edit_schema', { name: currentFile.name })}
                </span>
                <span className="text-xs text-zinc-500">
                  {t('row_col_count', {
                    rows: currentFile.rowCount?.toLocaleString() ?? 0,
                    cols: currentFile.columns.length,
                  })}
                </span>
                {currentFile.lastModified && (
                  <span className="text-xs text-zinc-400">
                    {t('last_updated')}:{' '}
                    {new Date(currentFile.lastModified).toLocaleString()}
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-400">
                {t('table_name_label', { name: currentFile.tableName })}
              </span>
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
    </div>
  )
}

// 列行组件
interface ColumnRowProps {
  column: ColumnSchema
  onToggleKey: () => void
  isLinked: boolean
}

function ColumnRow({ column, onToggleKey, isLinked }: ColumnRowProps) {
  const formatType = mapToFormatType(column.type)
  const config = FORMAT_CONFIG[formatType]
  const IconComponent = config.icon
  const { t } = useTranslation('common')

  // 格式化显示值（处理时间戳）
  const formatDisplayValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return ''

    const lowerType = type.toLowerCase()

    // 检查是否为时间类型
    if (
      lowerType.includes('date') ||
      lowerType.includes('time') ||
      lowerType.includes('timestamp')
    ) {
      try {
        const date = new Date(value)
        // 只有有效日期才格式化
        if (!isNaN(date.getTime())) {
          return date.toLocaleString()
        }
      } catch {
        // 忽略错误，回退到原始值
      }
    }

    // 其他类型直接转换为字符串
    return String(value)
  }

  return (
    <tr className="hover:bg-zinc-50 transition-colors">
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
          <span className="text-sm text-zinc-900">{column.name}</span>

          {/* 已关联标记 */}
          {isLinked && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              <Link2 className="w-3 h-3" />
              {/*已关联*/}
            </span>
          )}
        </div>
      </td>

      {/* Format - 带图标的 Badge */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded ${config.bgColor} ${config.textColor}`}
        >
          <IconComponent className="w-3.5 h-3.5" />
          {t(config.label)}
        </span>
      </td>

      {/* Preview */}
      <td className="px-4 py-3">
        {Array.isArray(column.sampleValues) &&
        column.sampleValues.length > 0 ? (
          <div className="flex gap-1 flex-wrap text-xs text-muted-foreground">
            {column.sampleValues.map((val, i) => {
              const displayValue = formatDisplayValue(val, column.type)
              return (
                <span
                  key={i}
                  className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] border text-zinc-600 max-w-[120px] truncate inline-block align-middle"
                  title={displayValue}
                >
                  {displayValue}
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
