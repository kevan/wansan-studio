import { WelcomeScreen } from './WelcomeScreen'
import { ChatStream } from './ChatStream'
import { SchemaEditor } from './SchemaEditor'
import { ComponentShowcase } from './ComponentShowcase'
import { StyleTest } from './StyleTest'
import { useFileStore } from '../stores/useFileStore'
import { RelationshipManager } from './data/relationship-manager'
import { DataWorkspaceLayout } from './DataWorkspaceLayout'

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
    activeView,
    setView,
  } = useFileStore()

  const readyFiles = files.filter(f => f.status === 'ready')
  const hasReadyFiles = readyFiles.length > 0
  const currentView = activeView

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
      {/*<div className="drag-region h-8 flex-shrink-0" />*/}

      {/* 中间面板头部 */}
      <header className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-8 px-2 flex items-center">
            <span className="font-semibold text-sm leading-none">
              {currentView === 'chat' && 'Analysis Chat'}
              {currentView === 'schema' && 'Schema Editor'}
              {currentView === 'relationships' && 'Relationship Manager'}
            </span>
          </div>
        </div>
      </header>

      {/* 根据状态显示不同界面 */}
      {!hasReadyFiles ? (
        <WelcomeScreen />
      ) : currentView === 'schema' ? (
        <div className="flex-1 overflow-hidden relative">
          <DataWorkspaceLayout>
            <SchemaEditor />
          </DataWorkspaceLayout>
        </div>
      ) : currentView === 'relationships' ? (
        <div className="flex-1 overflow-hidden relative">
          <DataWorkspaceLayout>
            <RelationshipManager />
          </DataWorkspaceLayout>
        </div>
      ) : (
        <DataWorkspaceLayout showAction={false}>
          <ChatStream />
        </DataWorkspaceLayout>
      )}
    </div>
  )
}
