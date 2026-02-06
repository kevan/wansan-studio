import React, { useRef, useEffect } from 'react'
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels'
import {
  RotateCcw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/stores/useUIStore'
import { ChatStream } from '../ChatStream'
import { DashboardCanvasV3 } from '../dashboard-v3'
import { FloatingActionLayout } from '../FloatingActionLayout'
import { ChartFullView } from '../viz/containers/ChartFullView'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'

export function AnalysisWorkspace() {
  const { t } = useTranslation('common')
  const analysisSplit = useUIStore(s => s.analysisSplit)
  const setAnalysisSplit = useUIStore(s => s.setAnalysisSplit)
  
  const analysisLayoutMode = useUIStore(s => s.analysisLayoutMode)
  const setAnalysisLayoutMode = useUIStore(s => s.setAnalysisLayoutMode)
  const isPresentationMode = useUIStore(s => s.isPresentationMode)
  const setPresentationMode = useUIStore(s => s.setPresentationMode)
  const editingReportId = useWorkbenchStore(s => s.editingReportId)

  const groupRef = useRef<import('react-resizable-panels').ImperativePanelGroupHandle>(null)
  const chatPanelRef = useRef<ImperativePanelHandle>(null)
  const dashboardPanelRef = useRef<ImperativePanelHandle>(null)
  const isInternalResizing = useRef(false)

  // React to Layout Mode Changes
  useEffect(() => {
    const mode = analysisLayoutMode
    const group = groupRef.current
    if (!group) return

    isInternalResizing.current = true
    
    if (mode === 'chat') {
      group.setLayout([100, 0])
    } else if (mode === 'board') {
      group.setLayout([0, 100])
    } else if (mode === 'split') {
      const targetChat = analysisSplit[0] || 40
      const targetDash = analysisSplit[1] || 60
      group.setLayout([targetChat, targetDash])
    }
    
    // Use a slightly longer timeout to ensure PanelGroup has updated its internal state
    const timer = setTimeout(() => { isInternalResizing.current = false }, 100)
    return () => clearTimeout(timer)
  }, [analysisLayoutMode, analysisSplit]) 

  const handleLayoutChange = (sizes: number[]) => {
    if (isInternalResizing.current) return
    
    // Only save user preferences if we are in split mode and both are visible
    if (analysisLayoutMode === 'split' && sizes[0] > 10 && sizes[1] > 10) {
        setAnalysisSplit(sizes)
    }
  }

  // Listen for global dashboard open event
  useEffect(() => {
    const handleOpenDashboard = () => {
      setAnalysisLayoutMode('split')
    }
    window.addEventListener('wansan:open-dashboard', handleOpenDashboard)
    return () => window.removeEventListener('wansan:open-dashboard', handleOpenDashboard)
  }, [setAnalysisLayoutMode])

  const togglePresentation = () => {
    if (isPresentationMode) {
        window.electronAPI?.windowControl?.('exit-fullscreen')
        setPresentationMode(false)
    }
  }

  const isChatCollapsed = analysisLayoutMode === 'board'
  const isDashboardCollapsed = analysisLayoutMode === 'chat'

  return (
    <div className="flex flex-col h-full w-full relative bg-white dark:bg-zinc-950">
      {/* Main Split Layout */}
      <PanelGroup
        ref={groupRef}
        direction="horizontal"
        className="flex-1 h-full"
        onLayout={handleLayoutChange}
      >
        {/* Left: Chat Stream */}
        <Panel
            ref={chatPanelRef}
            defaultSize={analysisSplit[0]}
            minSize={25}
            collapsible
            collapsedSize={0}
            className={cn(
                "bg-white dark:bg-zinc-950 transition-all duration-300 relative z-10",
                isChatCollapsed && "min-w-0 border-none"
            )}
        >
            <FloatingActionLayout showAction={false}>
                <ChatStream />
            </FloatingActionLayout>
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
            className={cn(
                "bg-zinc-100/60 dark:bg-zinc-900 transition-all duration-300 relative z-0",
                isDashboardCollapsed && "min-w-0 border-none"
            )}
        >
            <DashboardCanvasV3 isPresentationMode={!!isPresentationMode} />
            
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

      {/* Fullscreen Modal: Rendered at workspace level to be above all panels */}
      {editingReportId && (
        <ChartFullView key={editingReportId} />
      )}
    </div>
  )
}