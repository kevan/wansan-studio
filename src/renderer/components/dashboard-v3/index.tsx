import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, LayoutDashboard, ArrowLeft } from 'lucide-react'

import {
  PAGE_GAP_PX,
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
  SCREEN_WIDTH_PX,
} from './page-layer'
import { GridLayer } from './grid-layer'
import { PageLayer } from './page-layer'
import { LayoutScenario, useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { useUIStore } from '@/stores/useUIStore'
import { ChartFullView } from '@/components/report/chart-full-view'
import { useTranslation, Trans } from 'react-i18next'

interface DashboardCanvasV3Props {
  isPresentationMode?: boolean
}

export function DashboardCanvasV3({
  isPresentationMode = false,
}: DashboardCanvasV3Props) {
  const { t } = useTranslation('common')
  const canvasConfig = useWorkbenchStore(state => state.canvasConfig)
  const setCanvasConfig = useWorkbenchStore(state => state.setCanvasConfig)
  const layoutScenario = useWorkbenchStore(state => state.layoutScenario)
  const setLayoutScenario = useWorkbenchStore(state => state.setLayoutScenario)
  const pageCount = useWorkbenchStore(state => state.pageCount)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const mainPanelLayout = useUIStore(s => s.mainPanelLayout)

  const { zoom, layout } = canvasConfig
  const isA4 = layout === 'a4'
  const containerRef = useRef<HTMLDivElement>(null)

  // Gesture State
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 })

  // --- Auto-centering Logic ---
  const centerCanvas = useCallback((smooth = true) => {
    // Use timeout to ensure DOM has updated after layout/zoom changes
    setTimeout(() => {
      if (containerRef.current) {
        const container = containerRef.current
        const centerScrollX =
          (container.scrollWidth - container.clientWidth) / 2
        container.scrollTo({
          left: Math.max(0, centerScrollX),
          behavior: smooth ? 'smooth' : 'auto',
        })
      }
    }, 50)
  }, [])

  useEffect(() => {
    const target: LayoutScenario = isA4 ? 'print' : 'default'
    if (layoutScenario !== target) {
      setLayoutScenario(target)
    }

    centerCanvas()
  }, [isA4, layoutScenario, setLayoutScenario, centerCanvas])

  // Center when zoom or panel layout changes
  useEffect(() => {
    centerCanvas(true)
  }, [zoom, mainPanelLayout, centerCanvas])

  // Center on window resize
  useEffect(() => {
    const handleResize = () => centerCanvas(false)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [centerCanvas])

  // --- Zoom Logic (Ctrl + Wheel) ---
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY
        // Zoom step: 5% per tick
        const step = 5
        const direction = delta > 0 ? -1 : 1
        const nextZoom = Math.min(Math.max(zoom + step * direction, 10), 400)

        if (nextZoom !== zoom) {
          setCanvasConfig({ zoom: nextZoom })
        }
      }
    }

    // Passive: false is required to prevent default browser zoom
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [zoom, setCanvasConfig])

  // --- Space Key Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault() // Prevent page scroll
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsDragging(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // --- Pan Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle Mouse (button 1) OR (Left Mouse (button 0) + Space)
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      if (containerRef.current) {
        setScrollStart({
          left: containerRef.current.scrollLeft,
          top: containerRef.current.scrollTop,
        })
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    containerRef.current.scrollLeft = scrollStart.left - dx
    containerRef.current.scrollTop = scrollStart.top - dy
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const totalHeightPx =
    pageCount > 0
      ? pageCount * PAGE_HEIGHT_PX + Math.max(0, pageCount - 1) * PAGE_GAP_PX
      : undefined

  const gridWidth = isA4 ? PAGE_WIDTH_PX : SCREEN_WIDTH_PX
  // Allow zooming in both modes, but force 1.0 in Presentation Mode
  const activeScale = isPresentationMode ? 1.0 : zoom / 100

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full flex-1 overflow-auto bg-zinc-100/60 p-6 dark:bg-zinc-900 ${
        isSpacePressed ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className={`mx-auto flex min-h-min w-fit flex-col ${
          isA4 ? 'items-center' : ''
        }`}
      >
        <div
          id="dashboard-export-root"
          className={`relative w-full transition-transform duration-200 ${
            !isA4 ? 'bg-white shadow-sm' : ''
          }`}
          style={{
            transform: `scale(${activeScale})`,
            transformOrigin: 'top center',
            width: `${gridWidth}px`,
            minHeight: isA4
              ? `${totalHeightPx ?? PAGE_HEIGHT_PX}px`
              : '100vh',
          }}
        >
          <PageLayer isA4={isA4} pageCount={pageCount} />
          <GridLayer
            width={gridWidth}
            isA4={isA4}
            height={isA4 ? totalHeightPx : undefined}
            scale={activeScale}
          />

          {/* Empty State Guide */}
          {pinnedReports.length <= 1 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50 z-0">
              <div className="w-64 h-48 border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center bg-zinc-50/50">
                <LayoutDashboard className="w-12 h-12 text-zinc-300" />
              </div>
              <div className="mt-6 text-center max-w-sm px-4">
                <h3 className="text-lg font-bold text-zinc-400">
                  {t('empty_dashboard_title')}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  <Trans
                    i18nKey="common:empty_dashboard_desc"
                    components={{ strong: <strong className="text-zinc-500" /> }}
                  />
                </p>
              </div>

              {/* Arrow pointing to Chat */}
              {!isPresentationMode && (
                <div className="absolute left-10 top-1/2 -translate-x-full text-zinc-300 hidden xl:block">
                  <ArrowLeft className="w-8 h-8 animate-bounce-x" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ChartFullView />
    </div>
  )
}
