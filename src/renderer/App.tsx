import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { DevConsole } from './components/DevConsole'
import { isDev } from './utils/env'
import { Toaster } from './components/ui/toaster'
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels'
import {
  MonitorPlay,
  PanelLeft,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { DashboardCanvasV3 } from './components/dashboard-v3'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { cn } from '@/utils/cn'
import { useDataRehydrate } from '@/hooks/use-data-rehydrate'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'
import { useWorkbenchStore } from './stores/useWorkbenchStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useUIStore } from './stores/useUIStore'
import { useProjectStore } from './stores/useProjectStore'
import { useChatStore } from './stores/useChatStore'
import { OnboardingFlow } from './components/onboarding/OnboardingFlow'
import logo from './src/assets/logo.png'
import type { AIConfig } from '@shared/types'
import { useBootSequence } from './hooks/use-boot-sequence'
import { useRemoteConfig } from './hooks/use-remote-config'
import { UpdateModal } from './components/update-modal'
import { GlobalErrorHandler } from './components/system/GlobalErrorHandler'
import { ErrorBoundary } from './components/system/ErrorBoundary'
import { usePlatform } from './hooks/useIPC'
import { useProjectInit } from './hooks/use-project-init'
import { useStoreMigration } from './hooks/use-store-migration'
import { SchemaWarningModal } from './components/modals/SchemaWarningModal'
import { RefreshConfirmModal } from './components/modals/RefreshConfirmModal'
import { SettingsDialog } from './components/settings/SettingsDialog'
import { GlobalSqlLab } from './components/report/GlobalSqlLab'
import { DataPreviewPanel } from './components/report/data-preview-panel'

function App() {
  useBootSequence()
  useRemoteConfig()
  useDataRehydrate()
  useProjectInit()
  useStoreMigration()

  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  
  const mainPanelLayout = useUIStore(s => s.mainPanelLayout)
  const setMainPanelLayout = useUIStore(s => s.setMainPanelLayout)

  const [isRightCollapsed, setIsRightCollapsed] = useState(true)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const language = useSettingsStore(state => state.language)
  // const hasCompletedOnboarding = useSettingsStore(
  //   state => state.hasCompletedOnboarding,
  // )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatPanelRef = useRef<ImperativePanelHandle>(null)
  const leftPanelRef = useRef<ImperativePanelHandle>(null)
  const middlePanelRef = useRef<ImperativePanelHandle>(null)
  const rightPanelRef = useRef<ImperativePanelHandle>(null)
  const { t } = useTranslation('common')
  const { data: platform } = usePlatform()
  const [isStoreReady, setIsStoreReady] = useState(false)
  
  const activeFileId = useProjectStore(state => state.activeFileId)
  const activeView = useProjectStore(state => state.activeView)
  const isRestoring = useProjectStore(state => state.isRestoring)
  const isRefreshing = useProjectStore(state => state.isRefreshing)
  const isLoading = isRestoring || isRefreshing
  const loadingText = isRestoring ? t('restoring_session', { ns: 'chat' }) : t('command_refresh', { ns: 'chat' })

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setIsStoreReady(true))
    if (useSettingsStore.persist.hasHydrated()) {
      setIsStoreReady(true)
    }
    return unsub
  }, [])

  // Sync AI config to main process on startup
  useEffect(() => {
    const syncAIConfig = async () => {
      // First load sensitive data (API Key) from secure storage
      await useSettingsStore.getState().loadSensitiveData()

      const settings = useSettingsStore.getState()
      if (settings.apiKey) {
        const config: AIConfig = {
          apiKey: settings.apiKey,
          baseURL: settings.baseUrl,
          model: settings.model,
        }
        try {
          await window.electronAPI.setAIConfig(config)
          console.log('[App] Synced AI config to main process')
        } catch (error) {
          console.error('[App] Failed to sync AI config:', error)
        }
      }
    }
    syncAIConfig()
  }, [])

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
      const newSize = mainPanelLayout[2] > 0 ? mainPanelLayout[2] : 45
      rightPanelRef.current.resize?.(newSize)
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
    if (isStoreReady && language && i18n.language !== language) {
      void i18n.changeLanguage(language)
    }
  }, [language, isStoreReady])

  // Reset loading state on app startup to fix zombie loading states
  useEffect(() => {
    useChatStore.getState().resetLoading()
  }, [])

  useEffect(() => {
    const handleOpenDashboard = () => {
      const right = rightPanelRef.current
      if (right) {
        right.expand?.()
        right.resize?.(mainPanelLayout[2] || 45)
      }
      setIsRightCollapsed(false)
    }
    window.addEventListener('wansan:open-dashboard', handleOpenDashboard)
    return () =>
      window.removeEventListener('wansan:open-dashboard', handleOpenDashboard)
  }, [mainPanelLayout])

  useEffect(() => {
    const maybeOpenOnMaximize = () => {
      const isMaximized =
        window.innerWidth >=
          (window.screen.availWidth ?? window.innerWidth) - 2 &&
        window.innerHeight >=
          (window.screen.availHeight ?? window.innerHeight) - 2
      if (isMaximized && isRightCollapsed) {
        window.dispatchEvent(new Event('wansan:open-dashboard'))
      }
    }
    maybeOpenOnMaximize()
    window.addEventListener('resize', maybeOpenOnMaximize)
    return () => window.removeEventListener('resize', maybeOpenOnMaximize)
  }, [isRightCollapsed])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        togglePresentation()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresentationMode, togglePresentation])

  // 监听窗口全屏状态变化（处理系统级退出全屏）
  useEffect(() => {
    if (!window.electronAPI?.onWindowStateChanged) return

    const unsub = window.electronAPI.onWindowStateChanged(({ isFullScreen }) => {
      const left = leftPanelRef.current
      const middle = middlePanelRef.current
      const right = rightPanelRef.current
      if (!left || !middle || !right) return

      if (isFullScreen && !isPresentationMode) {
        // 进入全屏 -> 开启演示模式 UI
        left.collapse?.()
        middle.collapse?.()
        right.expand?.()
        setIsLeftCollapsed(true)
        setIsChatCollapsed(true)
        setIsPresentationMode(true)
      } else if (!isFullScreen && isPresentationMode) {
        // 退出全屏 -> 还原 UI
        left.expand?.()
        middle.expand?.()
        right.resize?.(mainPanelLayout[2] || 45)
        setIsLeftCollapsed(false)
        setIsChatCollapsed(false)
        setIsPresentationMode(false)
      }
    })

    return unsub
  }, [isPresentationMode, mainPanelLayout])

  const handleHeaderDoubleClick = useCallback(() => {
    window.electronAPI?.windowControl?.('toggle-maximize')
  }, [])

  // if (!hasCompletedOnboarding) {
  //   return (
  //     <div className="h-screen w-screen overflow-hidden bg-zinc-50 flex flex-col">
  //       <Toaster />
  //       <OnboardingFlow />
  //     </div>
  //   )
  // }

  return (
    <ErrorBoundary>
      <GlobalErrorHandler />
      <div className="h-screen w-screen overflow-hidden bg-zinc-50 flex flex-col">
        <Toaster />
        <UpdateModal />
        <SchemaWarningModal />
        <RefreshConfirmModal />
        <SettingsDialog />
        <GlobalSqlLab />
        {/* Global Window Header */}
        <header
          className="h-12 border-b border-zinc-200 flex items-center justify-between px-4 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur draggable z-50"
          onDoubleClick={handleHeaderDoubleClick}
        >
          {/* LEFT ZONE */}
          <div
            className={cn(
              'flex items-center gap-4 non-draggable shrink-0',
              platform === 'darwin' && !isPresentationMode ? 'pl-16' : 'pl-4'
            )}
          >
            {!isPresentationMode && (
              <>
                <button
                  className={`h-8 w-8 rounded-md border border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-200 transition-colors ${isLeftCollapsed ? 'text-zinc-400' : ''}`}
                  onClick={toggleLeft}
                  title={t('toggle_data_tree')}
                >
                  <PanelLeft className="h-4 w-4 mx-auto" />
                </button>
                <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
              </>
            )}
            {/* Logo Image */}
            <div className="flex items-center gap-2">
              <img
                src={logo}
                className="h-6 w-6 rounded-md "
                alt="Wansan Studio"
              />
              <span className="text-sm font-semibold text-zinc-900">
                Wansan Studio
              </span>
            </div>
          </div>
          {/* MIDDLE DRAG SPACER */}
          <div
            className="flex-1 h-full draggable"
            onDoubleClick={handleHeaderDoubleClick}
          />
          {/* RIGHT ZONE */}
          <div className="flex items-center gap-2 non-draggable shrink-0">
            {!isRightCollapsed && (
              <button
                className={`h-8 gap-2 px-3 rounded-md border border-transparent text-xs font-medium flex items-center transition-colors ${
                  isPresentationMode
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
                onClick={togglePresentation}
                title={isPresentationMode ? t('exit') : t('present')}
              >
                {isPresentationMode ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <MonitorPlay className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isPresentationMode ? t('exit') : t('present')}
                </span>
              </button>
            )}

            {!isPresentationMode && (
              <>
                {!isRightCollapsed && (
                  <div className="h-4 w-[1px] bg-zinc-200" />
                )}

                <button
                  className={cn(
                    'h-8 gap-2 px-3 rounded-md border text-xs font-medium flex items-center transition-colors',
                    isRightCollapsed
                      ? 'bg-black text-white border-black hover:bg-zinc-800'
                      : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-200'
                  )}
                  onClick={toggleRight}
                  title={
                    isRightCollapsed ? t('show_dashboard') : t('hide_dashboard')
                  }
                >
                  {isRightCollapsed ? (
                    <PanelRightOpen className="h-3.5 w-3.5" />
                  ) : (
                    <PanelRightClose className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isRightCollapsed
                      ? t('show_dashboard')
                      : t('hide_dashboard')}
                  </span>
                </button>
              </>
            )}
          </div>
        </header>

        <PanelGroup
          direction="horizontal"
          className="flex-1"
          onLayout={setMainPanelLayout}
        >
          {/* 左侧 Sidebar */}
          <Panel
            ref={leftPanelRef}
            defaultSize={mainPanelLayout[0]}
            minSize={15}
            maxSize={20}
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
            defaultSize={mainPanelLayout[1]}
            minSize={0}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsChatCollapsed(true)}
            onResize={size => setIsChatCollapsed(size < 5)}
            className={`bg-white dark:bg-zinc-950 transition-all duration-500 ${isPresentationMode ? 'min-w-0 border-none' : ''}`}
          >
            <main className="wansan-canvas h-full flex flex-col relative bg-white dark:bg-zinc-950 transition-colors">
              <MainContent />
            </main>
          </Panel>

          <PanelResizeHandle className="w-1 bg-zinc-100 hover:bg-zinc-300 transition-colors" />

          {/* 右侧 Report Canvas */}
          <Panel
            defaultSize={mainPanelLayout[2]}
            minSize={0}
            ref={rightPanelRef}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsRightCollapsed(true)}
            onExpand={() => setIsRightCollapsed(false)}
            className={`bg-zinc-100/60 dark:bg-zinc-900 transition-all duration-300 ${isRightCollapsed ? 'min-w-0' : ''}`}
          >
            <div className="h-full w-full flex flex-col bg-zinc-100/60 dark:bg-zinc-900">
              {!isPresentationMode && activeView !== 'schema' && (
                <div className="draggable shrink-0 border-b bg-white/50 backdrop-blur">
                  <div className="non-draggable">
                    <DashboardHeader />
                  </div>
                </div>
              )}
              <div
                className={cn(
                  'flex-1 w-full overflow-hidden transition-all',
                  isPresentationMode ? 'p-0' : 'p-1'
                )}
              >
                <div
                  className={cn(
                    'h-full w-full bg-white dark:bg-black transition-all',
                    !isPresentationMode &&
                      'rounded-lg border border-zinc-200 shadow-sm'
                  )}
                >
                  {activeView === 'schema' ? (
                    <DataPreviewPanel />
                  ) : (
                    <DashboardCanvasV3 isPresentationMode={isPresentationMode} />
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>

        {/* 开发模式调试控制台 */}
        {isDev && <DevConsole defaultOpen={false} />}

        {/* Global Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-[9999] bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-zinc-100 dark:border-zinc-800 scale-110">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                {loadingText}
              </p>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App
