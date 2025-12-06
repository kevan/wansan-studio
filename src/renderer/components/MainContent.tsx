import { WelcomeScreen } from './WelcomeScreen'
import { DataWorkspace } from './DataWorkspace.tsx'
import { SchemaConfirm } from './SchemaConfirm'
import { ComponentShowcase } from './ComponentShowcase'
import { StyleTest } from './StyleTest'
import { useFileStore } from '../stores/useFileStore'

interface MainContentProps {
  showShowcase?: boolean
  showStyleTest?: boolean
  onCloseShowcase?: () => void
  onCloseStyleTest?: () => void
}

export function MainContent({
  showShowcase = false,
  showStyleTest = false,
  onCloseShowcase,
  onCloseStyleTest,
}: MainContentProps) {
  const {
    files,
    showSchemaConfirm,
    setShowSchemaConfirm,
    confirmSchema,
    reset,
  } = useFileStore()

  const readyFiles = files.filter(f => f.status === 'ready')
  const hasReadyFiles = readyFiles.length > 0

  const handleConfirmSchema = () => {
    confirmSchema()
  }

  const handleCancelSchema = () => {
    setShowSchemaConfirm(false)
  }

  const handleReset = () => {
    reset()
  }

  // 开发模式下显示组件展示
  if (showShowcase) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="drag-region h-8 flex-shrink-0 border-b border-zinc-100" />
        <div className="p-4 border-b border-zinc-200 bg-zinc-50">
          <button
            onClick={onCloseShowcase}
            className="wansan-button wansan-button-secondary no-drag"
          >
            ← 返回主应用
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <ComponentShowcase />
        </div>
      </div>
    )
  }

  // 开发模式下显示样式测试
  if (showStyleTest) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="drag-region h-8 flex-shrink-0 border-b border-zinc-100" />
        <div className="p-4 border-b border-zinc-200 bg-zinc-50">
          <button
            onClick={onCloseStyleTest}
            className="wansan-button wansan-button-secondary no-drag"
          >
            ← 返回主应用
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <StyleTest />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* macOS 拖动区域 */}
      <div className="drag-region h-8 flex-shrink-0" />

      {/* 根据状态显示不同界面 */}
      {!hasReadyFiles ? (
        // 空状态 - 欢迎页面/Drop Zone
        <WelcomeScreen />
      ) : showSchemaConfirm ? (
        // Schema 确认页
        <SchemaConfirm
          onConfirm={handleConfirmSchema}
          onCancel={handleCancelSchema}
        />
      ) : (
        // 数据工作区
        <DataWorkspace onReset={handleReset} />
      )}
    </div>
  )
}
