import { ColumnSchema, useFileStore } from '../stores/useFileStore'
import { Hash, Type, Calendar, Key, Link2 } from 'lucide-react'

interface SchemaConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

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
    label: '数字',
    icon: Hash,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  text: {
    label: '文本',
    icon: Type,
    bgColor: 'bg-zinc-100',
    textColor: 'text-zinc-600',
  },
  date: {
    label: '日期',
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

export function SchemaConfirm({ onConfirm, onCancel }: SchemaConfirmProps) {
  const { files, activeFileId, setActiveFile, toggleKeyColumn, relations } =
    useFileStore()
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
    <div className="flex flex-col h-full relative">
      {/* 可滚动内容 */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* 顶部标题区 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            确认数据结构
          </h2>
          <p className="text-sm text-zinc-500">
            检查字段格式，并标记关联键以便多表 Join 分析
          </p>
        </div>

        {/* Tabs 切换多个文件 */}
        {readyFiles.length > 1 && (
          <div className="flex gap-1 mb-4 border-b border-zinc-200">
            {readyFiles.map(file => (
              <button
                key={file.id}
                onClick={() => setActiveFile(file.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  file.id === currentFileId
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {file.name}
                {file.columns.some(c => c.isKey) && (
                  <Key className="inline-block ml-1 w-3 h-3" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* 当前文件的 Schema 表格 */}
        {currentFile && (
          <div className="flex-1 min-h-0">
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              {/* 文件信息头 */}
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="font-medium text-zinc-900">
                    {currentFile.name}
                  </span>
                  <span className="ml-2 text-sm text-zinc-500">
                    {currentFile.rowCount?.toLocaleString()} 行 ·{' '}
                    {currentFile.columns.length} 列
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  表名: {currentFile.tableName}
                </span>
              </div>

              {/* 列表格 */}
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Field Name</th>
                    <th className="px-4 py-3 w-28">Format</th>
                    <th className="px-4 py-3">Preview</th>
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
          </div>
        )}
      </div>

      {/* 底部操作按钮 - 固定在底部 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 px-6 bg-white/90 backdrop-blur border-t border-zinc-200 flex items-center justify-between z-10">
        <div className="text-sm text-zinc-500 font-medium">
          {readyFiles.length} 个数据源已就绪
          {relations.length > 0 && (
            <span className="ml-2 text-indigo-600">
              · {relations.length} 个自动检测的关联
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="wansan-button wansan-button-secondary w-20"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="wansan-button wansan-button-primary w-24 bg-black hover:bg-zinc-800"
          >
            开始分析
          </button>
        </div>
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
            title={column.isKey ? '取消关联键' : '设为关联键'}
          >
            <Key className="w-3 h-3" />
          </button>

          {/* 字段名 */}
          <span className="text-sm text-zinc-900">{column.name}</span>

          {/* 已关联标记 */}
          {isLinked && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              <Link2 className="w-3 h-3" />
              已关联
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
          {config.label}
        </span>
      </td>

      {/* Preview */}
      <td className="px-4 py-3">
        {Array.isArray(column.sampleValues) && column.sampleValues.length > 0 ? (
          <div className="flex gap-1 flex-wrap text-xs text-muted-foreground">
            {column.sampleValues.map((val, i) => (
              <span
                key={i}
                className="bg-zinc-100 px-1 rounded text-[10px] border text-zinc-600"
              >
                {val}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground text-zinc-400 opacity-30 italic">
            No preview
          </span>
        )}
      </td>
    </tr>
  )
}
