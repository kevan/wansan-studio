import React, { useRef, useState, useEffect } from 'react'
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels'
import {
  MessageSquare,
  Columns,
  LayoutDashboard,
  RotateCcw,
  MonitorPlay,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/stores/useUIStore'
import { ChatStream } from '../ChatStream'
import { DashboardCanvasV3 } from '../dashboard-v3'
import { DataWorkspaceLayout } from '../DataWorkspaceLayout'

export function AnalysisWorkspace() {
  const { t } = useTranslation('common')
  const analysisSplit = useUIStore(s => s.analysisSplit)
  const setAnalysisSplit = useUIStore(s => s.setAnalysisSplit)

  const chatPanelRef = useRef<ImperativePanelHandle>(null)
  const dashboardPanelRef = useRef<ImperativePanelHandle>(null)

  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(true) // Default collapsed
  const [isPresentationMode, setIsPresentationMode] = useState(false)

  // Sync state with layout
  // Note: react-resizable-panels callbacks are better, but we need local state for UI buttons
  
  const handleLayoutModeChange = (mode: 'chat' | 'split' | 'board') => {
    if (mode === 'chat') {
      chatPanelRef.current?.expand?.()
      chatPanelRef.current?.resize?.(100)
      setIsChatCollapsed(false)
      
      dashboardPanelRef.current?.collapse?.()
      setIsDashboardCollapsed(true)
    } else if (mode === 'split') {
      chatPanelRef.current?.expand?.()
      setIsChatCollapsed(false)

      const targetChat = analysisSplit[0] || 40
      const targetDashboard = analysisSplit[1] || 60

      chatPanelRef.current?.resize?.(targetChat)
      dashboardPanelRef.current?.expand?.()
      dashboardPanelRef.current?.resize?.(targetDashboard)
      setIsDashboardCollapsed(false)
    } else if (mode === 'board') {
      chatPanelRef.current?.collapse?.()
      setIsChatCollapsed(true)
      
      dashboardPanelRef.current?.expand?.()
      dashboardPanelRef.current?.resize?.(100)
      setIsDashboardCollapsed(false)
    }
  }

  const currentLayoutMode = (() => {
    if (isChatCollapsed && !isDashboardCollapsed) return 'board'
    if (!isChatCollapsed && isDashboardCollapsed) return 'chat'
    return 'split'
  })()

  // Listen for global dashboard open event
  useEffect(() => {
    const handleOpenDashboard = () => {
      handleLayoutModeChange('split')
    }
    window.addEventListener('wansan:open-dashboard', handleOpenDashboard)
    return () => window.removeEventListener('wansan:open-dashboard', handleOpenDashboard)
  }, [])

  const togglePresentation = () => {
    if (isPresentationMode) {
        window.electronAPI?.windowControl?.('exit-fullscreen')
        setIsPresentationMode(false)
    } else {
        window.electronAPI?.windowControl?.('enter-fullscreen')
        setIsPresentationMode(true)
    }
  }

  // Sync Presentation Mode with Window State
  useEffect(() => {
    if (!window.electronAPI) return
    return window.electronAPI.onWindowStateChanged(({ isFullScreen }) => {
        setIsPresentationMode(isFullScreen)
    })
  }, [])

  return (
    <div className="flex flex-col h-full w-full relative bg-white dark:bg-zinc-950">
      {/* Floating Header Controls (Only visible when not in presentation mode) */}
      {!isPresentationMode && (
        <div className="absolute top-3 right-4 z-50 flex items-center gap-2 pointer-events-auto">
           {/* Layout Switcher */}
           <div className="flex items-center bg-zinc-100/80 backdrop-blur border border-zinc-200/50 rounded-lg p-0.5 gap-0.5 shadow-sm">
              <button
                onClick={() => handleLayoutModeChange('chat')}
                className={cn(
                  'h-7 px-2 rounded-md flex items-center justify-center transition-all text-xs font-medium gap-1.5',
                  currentLayoutMode === 'chat'
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
                )}
                title={t('focus_chat', 'Chat Only')}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleLayoutModeChange('split')}
                className={cn(
                  'h-7 px-2 rounded-md flex items-center justify-center transition-all text-xs font-medium gap-1.5',
                  currentLayoutMode === 'split'
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
                )}
                title={t('layout_split', 'Split View')}
              >
                <Columns className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleLayoutModeChange('board')}
                className={cn(
                  'h-7 px-2 rounded-md flex items-center justify-center transition-all text-xs font-medium gap-1.5',
                  currentLayoutMode === 'board'
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
                )}
                title={t('dashboard_only', 'Dashboard')}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
              </button>
           </div>

           {/* Presentation Toggle */}
           <button
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm border',
                'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              )}
              onClick={togglePresentation}
              title={t('present')}
            >
              <MonitorPlay className="h-3.5 w-3.5" />
            </button>
        </div>
      )}

      {/* Main Split Layout */}
      <PanelGroup
        direction="horizontal"
        className="flex-1 h-full"
        onLayout={setAnalysisSplit}
      >
        {/* Left: Chat Stream */}
        <Panel
            ref={chatPanelRef}
            defaultSize={analysisSplit[0]}
            minSize={25}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsChatCollapsed(true)}
            onExpand={() => setIsChatCollapsed(false)}
            className={cn(
                "bg-white dark:bg-zinc-950 transition-all duration-300 relative z-10",
                isChatCollapsed && "min-w-0 border-none"
            )}
        >
            <DataWorkspaceLayout showAction={false}>
                <ChatStream />
            </DataWorkspaceLayout>
        </Panel>

        <PanelResizeHandle className="w-1.5 flex justify-center bg-transparent hover:bg-zinc-100 transition-colors cursor-col-resize z-20 focus:outline-none group">
            <div className="w-px h-full bg-zinc-200/50 group-hover:bg-indigo-400/50 transition-colors" />
        </PanelResizeHandle>

        {/* Right: Dashboard */}
        <Panel
            ref={dashboardPanelRef}
            defaultSize={analysisSplit[1]}
            minSize={25}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsDashboardCollapsed(true)}
            onExpand={() => setIsDashboardCollapsed(false)}
            className={cn(
                "bg-zinc-100/60 dark:bg-zinc-900 transition-all duration-300 relative z-0",
                isDashboardCollapsed && "min-w-0 border-none"
            )}
        >
            <DashboardCanvasV3 isPresentationMode={isPresentationMode} />
            
            {/* Exit Presentation Button (Floating when fullscreen) */}
            {isPresentationMode && (
                <button
                    onClick={togglePresentation}
                    className="absolute bottom-6 right-6 z-50 bg-black/75 hover:bg-black text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 backdrop-blur transition-all shadow-2xl hover:scale-105 active:scale-95"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('exit_presentation', 'Exit Fullscreen')}
                </button>
            )}
        </Panel>
      </PanelGroup>
    </div>
  )
}
