import { useState, useCallback, useRef, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { DevConsole } from './components/DevConsole'
import { isDev } from './utils/env'
import { Toaster } from './components/ui/toaster'
import {
  Panel,
  PanelResizeHandle,
  PanelGroup,
  ImperativePanelHandle,
} from 'react-resizable-panels'
import {
  ChevronRight,
  PanelLeft,
  PanelRight,
  LayoutDashboard,
  Database,
  MonitorPlay,
  RotateCcw,
} from 'lucide-react'
import { DashboardCanvasV3 } from './components/dashboard-v3'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { cn } from '@/utils/cn'
import { Input } from '@/components/ui/input'
import { useFileStore } from './stores/useFileStore'
import { useDataRehydrate } from '@/hooks/use-data-rehydrate'

function App() {
  useDataRehydrate()
  const { projectName, setProjectName } = useFileStore()
  const [showShowcase, setShowShowcase] = useState(false)
  const [showStyleTest, setShowStyleTest] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isRightCollapsed, setIsRightCollapsed] = useState(false)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatPanelRef = useRef<ImperativePanelHandle>(null)
  const leftPanelRef = useRef<ImperativePanelHandle>(null)
  const middlePanelRef = useRef<ImperativePanelHandle>(null)
  const rightPanelRef = useRef<ImperativePanelHandle>(null)

  const handleShowcase = useCallback(() => setShowShowcase(true), [])
  const handleStyleTest = useCallback(() => setShowStyleTest(true), [])

  // 处理导入数据 - 触发文件选择或其他导入方式
  const handleImportData = useCallback(() => {
    // 这里可以扩展为打开一个导入对话框
    // 目前简单地让用户知道可以通过主区域的 Drop Zone 导入
    // 或者触发系统文件选择器
    if (window.electronAPI) {
      window.electronAPI.selectFile().then(result => {
        if (result.success && result.data) {
          // 通过 WelcomeScreen 的逻辑处理
          // 这里可以直接触发文件处理，但为了保持逻辑一致性，
          // 提示用户使用 Drop Zone
          alert('请将文件拖拽到右侧区域，或在空状态页面点击选择文件')
        }
      })
    }
  }, [])

  const toggleChatCollapse = () => {
    if (isChatCollapsed) {
      chatPanelRef.current?.expand?.()
      chatPanelRef.current?.resize?.(35)
      setIsChatCollapsed(false)
    } else {
      chatPanelRef.current?.collapse?.()
      setIsChatCollapsed(true)
    }
  }

  const toggleLeft = () => {
    if (!leftPanelRef.current) return
    if (isLeftCollapsed) {
      leftPanelRef.current.expand?.()
      leftPanelRef.current.resize?.(20)
      setIsLeftCollapsed(false)
    } else {
      leftPanelRef.current.collapse?.()
      setIsLeftCollapsed(true)
    }
  }

  const toggleRight = () => {
    if (!rightPanelRef.current) return
    if (isRightCollapsed) {
      rightPanelRef.current.expand?.()
      rightPanelRef.current.resize?.(45)
      setIsRightCollapsed(false)
    } else {
      rightPanelRef.current.collapse?.()
      setIsRightCollapsed(true)
    }
  }

  const togglePresentation = () => {
    const left = leftPanelRef.current
    const middle = middlePanelRef.current
    const right = rightPanelRef.current
    if (!left || !middle || !right) return

    if (isPresentationMode) {
      left.expand?.()
      middle.expand?.()
      right.resize?.(45)
      setIsLeftCollapsed(false)
      setIsChatCollapsed(false)
      window.electronAPI?.windowControl?.('exit-fullscreen')
      setIsPresentationMode(false)
    } else {
      left.collapse?.()
      middle.collapse?.()
      right.expand?.()
      setIsLeftCollapsed(true)
      setIsChatCollapsed(true)
      window.electronAPI?.windowControl?.('enter-fullscreen')
      setIsPresentationMode(true)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        togglePresentation()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresentationMode, togglePresentation])

  const handleHeaderDoubleClick = useCallback(() => {
    window.electronAPI?.windowControl?.('toggle-maximize')
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-50 flex flex-col">
      <Toaster />
      {/* Global Window Header */}
      <header
        className="h-12 border-b border-zinc-200 flex items-center justify-between px-4 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur draggable z-50"
        onDoubleClick={handleHeaderDoubleClick}
      >
        {/* LEFT ZONE */}
        <div className="flex items-center gap-4 pl-16 non-draggable shrink-0">
          <button
            className={`h-8 w-8 rounded-md border border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-200 transition-colors ${isLeftCollapsed ? 'text-zinc-400' : ''}`}
            onClick={toggleLeft}
            title="Toggle Data Tree"
          >
            <PanelLeft className="h-4 w-4 mx-auto" />
          </button>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex items-center gap-2 group">
            <Database className="h-4 w-4 text-indigo-500" />
            <Input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="h-8 w-[220px] border-transparent hover:border-zinc-200 bg-transparent text-sm font-semibold px-2 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
            />
          </div>
        </div>
        {/* MIDDLE DRAG SPACER */}
        <div
          className="flex-1 h-full draggable"
          onDoubleClick={handleHeaderDoubleClick}
        />
        {/* RIGHT ZONE */}
        <div className="flex items-center gap-2 non-draggable shrink-0">
          <button
            className={`h-8 gap-2 px-3 rounded-md border border-transparent text-xs font-medium flex items-center transition-colors ${
              isRightCollapsed
                ? 'bg-zinc-100 text-zinc-700'
                : 'text-zinc-600 hover:text-zinc-900 hover:border-zinc-200'
            }`}
            onClick={toggleRight}
            title={isRightCollapsed ? 'Open Dashboard' : 'Focus Chat'}
          >
            <span className="hidden sm:inline">
              {isRightCollapsed ? 'Open Dashboard' : 'Focus Chat'}
            </span>
            <PanelRight className="h-4 w-4" />
          </button>
          <button
            className={`h-8 gap-2 px-3 rounded-md border border-dashed text-xs font-medium flex items-center transition-colors ${
              isPresentationMode
                ? 'bg-zinc-800 text-white border-zinc-700'
                : 'text-zinc-600 hover:text-zinc-900 hover:border-zinc-200'
            }`}
            onClick={togglePresentation}
            title={isPresentationMode ? 'Exit Presentation' : 'Enter Presentation Mode'}
          >
            {isPresentationMode ? (
              <RotateCcw className="h-3.5 w-3.5" />
            ) : (
              <MonitorPlay className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {isPresentationMode ? 'Exit' : 'Present'}
            </span>
          </button>
        </div>
      </header>

      <PanelGroup direction="horizontal" className="flex-1">
        {/* 左侧 Sidebar */}
        <Panel
          ref={leftPanelRef}
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible
          collapsedSize={0}
          onCollapse={() => setIsLeftCollapsed(true)}
          onExpand={() => setIsLeftCollapsed(false)}
          className={`border-r border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 transition-all duration-300 ${isLeftCollapsed ? 'min-w-0 border-none' : ''}`}
        >
          <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900/50">
            <div className="flex-1 overflow-y-auto">
              <Sidebar onImportData={handleImportData} />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-zinc-100 hover:bg-zinc-300 transition-colors" />

        {/* 主画布区域 - Chat/Workspace */}
        <Panel
          ref={middlePanelRef}
          defaultSize={35}
          minSize={0}
          collapsible
          collapsedSize={0}
          onCollapse={() => setIsChatCollapsed(true)}
          onResize={size => setIsChatCollapsed(size < 5)}
          className={`bg-white dark:bg-zinc-950 transition-all duration-500 ${isPresentationMode ? 'min-w-0 border-none' : ''}`}
        >
          <main className="wansan-canvas h-full flex flex-col relative bg-white dark:bg-zinc-950 transition-colors">
            <MainContent
              showShowcase={showShowcase}
              showStyleTest={showStyleTest}
              onCloseShowcase={() => setShowShowcase(false)}
              onCloseStyleTest={() => setShowStyleTest(false)}
            />
          </main>
        </Panel>

        <PanelResizeHandle className="w-1 bg-zinc-100 hover:bg-zinc-300 transition-colors" />

        {/* 右侧 Report Canvas */}
        <Panel
          defaultSize={45}
          minSize={30}
          ref={rightPanelRef}
          collapsible
          collapsedSize={0}
          onCollapse={() => setIsRightCollapsed(true)}
          onExpand={() => setIsRightCollapsed(false)}
          className={`bg-zinc-100/60 dark:bg-zinc-900 transition-all duration-300 ${isRightCollapsed ? 'min-w-0' : ''}`}
        >
          <div className="h-full w-full flex flex-col bg-zinc-100/60 dark:bg-zinc-900">
            {!isPresentationMode && (
              <div className="draggable shrink-0 border-b bg-white/50 backdrop-blur">
                <div className="non-draggable">
                  <DashboardHeader />
                </div>
              </div>
            )}
            <div
              className={cn(
                'flex-1 w-full overflow-hidden transition-all',
                isPresentationMode ? 'p-0' : 'p-4'
              )}
            >
              <div
                className={cn(
                  'h-full w-full bg-white dark:bg-black transition-all',
                  !isPresentationMode && 'rounded-lg border border-zinc-200 shadow-sm'
                )}
              >
                <DashboardCanvasV3 />
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {/* 开发模式调试控制台 */}
      {/* {isDev && (
        <DevConsole
          defaultOpen={true}
          onShowcase={handleShowcase}
          onStyleTest={handleStyleTest}
        />
      )} */}
    </div>
  )
}

export default App
