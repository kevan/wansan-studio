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
  CloudCheck,
  CloudOff,
  Columns,
  Info,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  MonitorPlay,
  PanelLeft,
  RotateCcw,
} from 'lucide-react'
import { DashboardCanvasV3 } from './components/dashboard-v3'
import { cn } from '@/utils/cn'
import { useDataRehydrate } from '@/hooks/use-data-rehydrate'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'
import { useSettingsStore } from './stores/useSettingsStore'
import { useUIStore } from './stores/useUIStore'
import { useProjectStore } from './stores/useProjectStore'
import { useChatStore } from './stores/useChatStore'
import logo from './src/assets/logo.png'
import { useBootSequence } from './hooks/use-boot-sequence'
import { useRemoteConfig } from './hooks/use-remote-config'
import { UpdateModal } from './components/update-modal'
import { GlobalErrorHandler } from './components/system/GlobalErrorHandler'
import { ErrorBoundary } from './components/system/ErrorBoundary'
import { usePlatform } from './hooks/useIPC'
import { useProjectInit } from './hooks/use-project-init'
import { SchemaWarningModal } from './components/modals/SchemaWarningModal'
import { RefreshConfirmModal } from './components/modals/RefreshConfirmModal'
import { SettingsDialog } from './components/settings/SettingsDialog'
import { GlobalSqlLab } from './components/report/GlobalSqlLab'
import { DataPreviewPanel } from './components/report/data-preview-panel'
import { useAutoCleanup } from './hooks/use-auto-cleanup'
import { MigrationWizard } from './components/migration/MigrationWizard'
import { useMigrationStore } from './stores/useMigrationStore'
import { AutoSaveStatus, useAutoSave } from './hooks/useAutoSave'
import { ProjectLauncher } from './components/launcher/ProjectLauncher'
import { DataIngestionWizard } from './components/wizard/DataIngestionWizard'

function App() {
  useBootSequence()
  useRemoteConfig()
  useDataRehydrate()
  useProjectInit()
  useAutoCleanup()
  // useStoreMigration()

  const { isMigrationNeeded, isChecking, checkStatus } = useMigrationStore()
  const { status: saveStatus, lastError: saveError, forceSave } = useAutoSave()
  const currentProjectPath = useProjectStore(s => s.currentProjectPath)
  const projectName = useProjectStore(s => s.meta.name)
  const isProjectLoaded = useProjectStore(s => s.isProjectLoaded)

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)

  const sidebarLayout = useUIStore(s => s.sidebarLayout)
  const contentLayout = useUIStore(s => s.contentLayout)
  const lastContentSplit = useUIStore(s => s.lastContentSplit)
  const setSidebarLayout = useUIStore(s => s.setSidebarLayout)
  const setContentLayout = useUIStore(s => s.setContentLayout)
  const setLastContentSplit = useUIStore(s => s.setLastContentSplit)

  const [isRightCollapsed, setIsRightCollapsed] = useState(true)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const language = useSettingsStore(state => state.language)
  // const hasCompletedOnboarding = useSettingsStore(
  //   state => state.hasCompletedOnboarding,
  // )
  const leftPanelRef = useRef<ImperativePanelHandle>(null)
  const middlePanelRef = useRef<ImperativePanelHandle>(null)
  const rightPanelRef = useRef<ImperativePanelHandle>(null)
  const { t } = useTranslation('common')
  const platform = usePlatform()
  const [isStoreReady, setIsStoreReady] = useState(false)

  const activeView = useProjectStore(state => state.activeView)
  const isRestoring = useProjectStore(state => state.isRestoring)
  const isRefreshing = useProjectStore(state => state.isRefreshing)
  const isLoading = isRestoring || isRefreshing
  const loadingText = isRestoring
    ? t('restoring_session', { ns: 'chat' })
    : t('command_refresh', { ns: 'chat' })

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() =>
      setIsStoreReady(true)
    )
    if (useSettingsStore.persist.hasHydrated()) {
      setIsStoreReady(true)
    }
    return unsub
  }, [])

  // Sync AI config to main process on startup
  useEffect(() => {
    const syncAIConfig = async () => {
      // First load sensitive data (API Key) from secure storage to frontend state
      // This is purely for UI display (masked key) and local state consistency.
      // The Main process AIService already loads the key directly from secure storage.
      await useSettingsStore.getState().loadSensitiveData()
      console.log('[App] Synced sensitive data to UI state')
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

  // Layout Mode Logic
  type LayoutMode = 'chat' | 'split' | 'board'

  const currentLayoutMode: LayoutMode = (() => {
    if (isChatCollapsed && !isRightCollapsed) return 'board'
    if (!isChatCollapsed && isRightCollapsed) return 'chat'
    return 'split'
  })()

  const handleLayoutModeChange = (mode: LayoutMode) => {
    if (mode === 'chat') {
      middlePanelRef.current?.expand?.()
      middlePanelRef.current?.resize?.(100) // Full width in content group
      setIsChatCollapsed(false)
      rightPanelRef.current?.collapse?.()
      setIsRightCollapsed(true)
    } else if (mode === 'split') {
      middlePanelRef.current?.expand?.()
      setIsChatCollapsed(false)

      // Restore user preference relative to CONTENT GROUP
      const targetMiddle = lastContentSplit[0] || 40
      const targetRight = lastContentSplit[1] || 60

      middlePanelRef.current?.resize?.(targetMiddle)

      rightPanelRef.current?.expand?.()
      rightPanelRef.current?.resize?.(targetRight)
      setIsRightCollapsed(false)
    } else if (mode === 'board') {
      middlePanelRef.current?.collapse?.()
      setIsChatCollapsed(true)
      rightPanelRef.current?.expand?.()
      rightPanelRef.current?.resize?.(100)
      setIsRightCollapsed(false)
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

  const togglePresentation = () => {
    if (isPresentationMode) {
      window.electronAPI?.windowControl?.('exit-fullscreen')
      setIsPresentationMode(false)
    } else {
      window.electronAPI?.windowControl?.('enter-fullscreen')
      setIsPresentationMode(true)
    }
  }

  useEffect(() => {
    if (isStoreReady && language && i18n.language !== language) {
      void i18n.changeLanguage(language)
      window.electronAPI?.setLanguage?.(language as 'en' | 'zh')
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
        const targetSize = useUIStore.getState().lastContentSplit[1] || 60
        right.resize?.(targetSize)
      }
      setIsRightCollapsed(false)
    }
    window.addEventListener('wansan:open-dashboard', handleOpenDashboard)
    return () =>
      window.removeEventListener('wansan:open-dashboard', handleOpenDashboard)
  }, [])

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
    if (!window.electronAPI) return

    let unsubWindow: (() => void) | undefined
    if (window.electronAPI.onWindowStateChanged) {
      unsubWindow = window.electronAPI.onWindowStateChanged(
        ({ isFullScreen }) => {
          if (isFullScreen && !isPresentationMode) {
            setIsPresentationMode(true)
          } else if (!isFullScreen && isPresentationMode) {
            setIsPresentationMode(false)
          }
        }
      )
    }

    // Listen for file progress
    let unsubProgress: (() => void) | undefined
    if (window.electronAPI.onFileProgress) {
      unsubProgress = window.electronAPI.onFileProgress(
        ({ fileId, progress }) => {
          useProjectStore.getState().updateFileProgress(fileId, progress)
        }
      )
    }

    return () => {
      unsubWindow?.()
      unsubProgress?.()
    }
  }, [isPresentationMode])

  useEffect(() => {
    if (!window.electronAPI) return
    const unsubClose = window.electronAPI.onCommandCloseProject?.(() => {
      useProjectStore.getState().closeProject()
    })

    // Listen for Remote Config
    let unsubRemote: (() => void) | undefined
    if (window.electronAPI.onRemoteConfig) {
      unsubRemote = window.electronAPI.onRemoteConfig(config => {
        console.log('[App] Received remote config:', config)
        useSettingsStore.getState().setRemoteConfig(config)
      })
    }

    return () => {
      unsubClose?.()
      unsubRemote?.()
    }
  }, [])

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

  if (isChecking) {
    return (
      <div className="h-screen w-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <GlobalErrorHandler />
      <Toaster />

      {/* DevConsole - Always available in dev mode */}
      {isDev && <DevConsole defaultOpen={false} />}

      {isMigrationNeeded ? (
        <MigrationWizard />
      ) : !currentProjectPath ? (
        <ProjectLauncher />
      ) : !isProjectLoaded ? (
        <div className="h-screen w-screen bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-indigo-50 animate-ping opacity-25" />
              <div className="relative p-4 bg-white rounded-full border border-zinc-100 shadow-sm">
                <img
                  src={logo}
                  className="h-12 w-12 grayscale opacity-50"
                  alt="Loading"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Initializing Workspace
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen w-screen overflow-hidden bg-zinc-50 flex flex-col">
          <UpdateModal />
          <SchemaWarningModal />
          <RefreshConfirmModal />
          <SettingsDialog />
          <DataIngestionWizard />
          <GlobalSqlLab />
          {/* Global Window Header */}
          <header
            className="h-12 border-b border-zinc-200 flex items-center justify-between px-4 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur draggable z-50"
            onDoubleClick={handleHeaderDoubleClick}
          >
            {/* LEFT ZONE */}
            <div
              className={cn(
                'flex items-center gap-3 non-draggable shrink-0',
                platform === 'darwin' && !isPresentationMode ? 'pl-16' : 'pl-4'
              )}
            >
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
                {currentProjectPath && (
                  <>
                    <span className="text-zinc-300">/</span>
                    <span
                      className="text-sm font-medium text-zinc-600 truncate max-w-[200px]"
                      title={projectName}
                    >
                      {projectName}
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* MIDDLE DRAG SPACER */}
            <div
              className="flex-1 h-full draggable"
              onDoubleClick={handleHeaderDoubleClick}
            />
            {/* RIGHT ZONE */}
            <div className="flex items-center gap-1 non-draggable shrink-0">
              {/* Auto-Save Indicator */}
              {currentProjectPath && (
                <div className="mr-2">
                  <AutoSaveIndicator
                    status={saveStatus}
                    error={saveError}
                    onForceSave={forceSave}
                  />
                </div>
              )}

              {/* Layout Control Group */}
              <div className="flex items-center bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                {!isPresentationMode && (
                  <>
                    {/* Toggle Left Sidebar */}
                    <button
                      className={cn(
                        'h-7 w-8 rounded-md flex items-center justify-center transition-all active:scale-95 group',
                        isLeftCollapsed
                          ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50'
                          : 'text-zinc-900 bg-white shadow-sm border border-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600'
                      )}
                      onClick={toggleLeft}
                      title={t('toggle_data_tree')}
                    >
                      <PanelLeft className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700 mx-1.5 opacity-50" />

                    {/* Layout Switcher: Chat | Split | Board */}
                    <div className="flex items-center bg-zinc-200/50 rounded-md p-0.5 gap-0.5">
                      <button
                        onClick={() => handleLayoutModeChange('chat')}
                        className={cn(
                          'h-6 px-2 rounded-sm flex items-center justify-center transition-all text-[10px] font-medium gap-1.5',
                          currentLayoutMode === 'chat'
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
                        )}
                        title={t('focus_chat', 'Chat Only')}
                      >
                        <MessageSquare className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleLayoutModeChange('split')}
                        className={cn(
                          'h-6 px-2 rounded-sm flex items-center justify-center transition-all text-[10px] font-medium gap-1.5',
                          currentLayoutMode === 'split'
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
                        )}
                        title={t('layout_split', 'Split View')}
                      >
                        <Columns className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleLayoutModeChange('board')}
                        className={cn(
                          'h-6 px-2 rounded-sm flex items-center justify-center transition-all text-[10px] font-medium gap-1.5',
                          currentLayoutMode === 'board'
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
                        )}
                        title={t('dashboard_only', 'Dashboard')}
                      >
                        <LayoutDashboard className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700 mx-1.5 opacity-50" />
                  </>
                )}

                {/* Toggle Presentation Mode */}
                <button
                  className={cn(
                    'h-7 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95',
                    isPresentationMode
                      ? 'bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
                  )}
                  onClick={togglePresentation}
                  title={isPresentationMode ? t('exit') : t('present')}
                >
                  {isPresentationMode ? (
                    <RotateCcw className="h-3 w-3" />
                  ) : (
                    <MonitorPlay className="h-3 w-3" />
                  )}
                  <span className="hidden lg:inline">
                    {isPresentationMode ? t('exit') : t('present')}
                  </span>
                </button>
              </div>
            </div>
          </header>

          <PanelGroup
            direction="horizontal"
            className="flex-1"
            onLayout={setSidebarLayout}
          >
            {/* 左侧 Sidebar */}
            <Panel
              ref={leftPanelRef}
              defaultSize={sidebarLayout[0]}
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

            <PanelResizeHandle className="w-2 flex justify-center bg-transparent hover:bg-zinc-50 transition-colors cursor-col-resize group focus:outline-none z-10">
              <div className="w-px h-full bg-zinc-200 group-hover:bg-zinc-300 transition-colors" />
            </PanelResizeHandle>

            {/* Main Content Wrapper (Chat + Dashboard) */}
            <Panel minSize={30}>
              <PanelGroup
                direction="horizontal"
                onLayout={layout => {
                  setContentLayout(layout)
                  // Save split preference only if both are visible
                  if (layout[0] > 10 && layout[1] > 10) {
                    setLastContentSplit(layout)
                  }
                }}
              >
                {/* 主画布区域 - Chat/Workspace */}
                <Panel
                  ref={middlePanelRef}
                  defaultSize={contentLayout[0]}
                  minSize={25}
                  collapsible
                  collapsedSize={0}
                  onCollapse={() => setIsChatCollapsed(true)}
                  onExpand={() => setIsChatCollapsed(false)}
                  className={`bg-white dark:bg-zinc-950 transition-all duration-500 ${isPresentationMode ? 'min-w-0 border-none' : ''}`}
                >
                  <main className="wansan-canvas h-full flex flex-col relative bg-white dark:bg-zinc-950 transition-colors">
                    < MainContent />
                  </main>
                </Panel>

                <PanelResizeHandle className="w-2 flex justify-center bg-transparent hover:bg-zinc-50 transition-colors cursor-col-resize group focus:outline-none z-10">
              <div className="w-px h-full bg-zinc-200 group-hover:bg-zinc-300 transition-colors" />
            </PanelResizeHandle>

                {/* 右侧 Report Canvas */}
                <Panel
                  defaultSize={contentLayout[1]}
                  minSize={25}
                  ref={rightPanelRef}
                  collapsible
                  collapsedSize={0}
                  onCollapse={() => setIsRightCollapsed(true)}
                  onExpand={() => setIsRightCollapsed(false)}
                  className={`bg-zinc-100/60 dark:bg-zinc-900 transition-all duration-300 ${isRightCollapsed ? 'min-w-0' : ''}`}
                >
                  {activeView === 'chat' ? (
                    <DashboardCanvasV3
                      isPresentationMode={isPresentationMode}
                    />
                  ) : activeView === 'schema' ? (
                    <div className="h-full w-full">
                      <div className="h-full w-full bg-white dark:bg-black border border-zinc-200 shadow-sm overflow-hidden">
                        <DataPreviewPanel />
                      </div>
                    </div>
                  ) : null}
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>

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
      )}
    </ErrorBoundary>
  )
}

function AutoSaveIndicator({
  status,
  error,
  onForceSave,
}: {
  status: AutoSaveStatus
  error: string | null
  onForceSave: () => void
}) {
  const { t } = useTranslation('project')
  const getTitle = () => {
    if (status === 'saved') return t('autosave_all_saved')
    if (status === 'saving') return t('autosave_saving')
    if (status === 'unsaved') return t('autosave_unsaved')
    if (status === 'error') return error || t('autosave_error')
    return ''
  }

  return (
    <button
      onClick={onForceSave}
      title={`${getTitle()}\n${t('autosave_force_save_hint')}`}
      className={cn(
        'h-8 px-2 rounded-md flex items-center gap-1.5 transition-all outline-none',
        status === 'error'
          ? 'text-red-500 hover:bg-red-50'
          : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
      )}
    >
      {status === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status === 'saved' && <CloudCheck className="h-3.5 w-3.5 opacity-50" />}
      {status === 'unsaved' && <CloudOff className="h-3.5 w-3.5" />}
      {status === 'error' && <Info className="h-3.5 w-3.5" />}

      <span className="text-[10px] font-bold uppercase tracking-widest tabular-nums">
        {status === 'saving'
          ? t('status_saving')
          : status === 'error'
            ? t('status_error')
            : ''}
      </span>
    </button>
  )
}

export default App
