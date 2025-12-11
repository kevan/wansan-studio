import React, { useEffect } from 'react'
import { Plus } from 'lucide-react'

import {
  PAGE_GAP_PX,
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
} from './page-layer'
import { GridLayer } from './grid-layer'
import { PageLayer } from './page-layer'
import { LayoutScenario, useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { ChartFullView } from '@/components/report/chart-full-view'

export function DashboardCanvasV3() {
  const canvasConfig = useWorkbenchStore(state => state.canvasConfig)
  const layoutScenario = useWorkbenchStore(state => state.layoutScenario)
  const setLayoutScenario = useWorkbenchStore(state => state.setLayoutScenario)
  const pageCount = useWorkbenchStore(state => state.pageCount)

  const { zoom, layout } = canvasConfig
  const isA4 = layout === 'a4'

  useEffect(() => {
    const target: LayoutScenario = isA4 ? 'print' : 'default'
    if (layoutScenario !== target) {
      setLayoutScenario(target)
    }
  }, [isA4, layoutScenario, setLayoutScenario])

  const totalHeightPx =
    pageCount > 0 ? pageCount * PAGE_HEIGHT_PX + Math.max(0, pageCount - 1) * PAGE_GAP_PX : undefined

  const gridWidth = isA4 ? PAGE_WIDTH_PX : 1200

  return (
    <div className="flex h-full w-full flex-1 justify-center overflow-auto bg-zinc-100/60 p-6 dark:bg-zinc-900">
      <div className="flex min-h-min flex-col items-center">
        <div
          id="dashboard-export-root"
          className="relative w-full transition-transform duration-200"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            width: isA4 ? `${PAGE_WIDTH_PX}px` : '100%',
            minHeight: isA4 ? `${totalHeightPx ?? PAGE_HEIGHT_PX}px` : '100%',
          }}
        >
          <PageLayer isA4={isA4} pageCount={pageCount} />
          <GridLayer
            width={gridWidth}
            isA4={isA4}
            height={isA4 ? totalHeightPx : undefined}
          />
        </div>

      </div>

      <ChartFullView />
    </div>
  )
}
