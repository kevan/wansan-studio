import React, { useEffect } from 'react'

import { DashboardGrid } from '../dashboard/dashboard-grid'
import { LayoutScenario, useWorkbenchStore } from '../../stores/useWorkbenchStore'

export function ReportCanvas() {
  const layoutScenario = useWorkbenchStore(state => state.layoutScenario)
  const setLayoutScenario = useWorkbenchStore(state => state.setLayoutScenario)
  const canvasConfig = useWorkbenchStore(state => state.canvasConfig)

  const { layout, zoom } = canvasConfig
  const isA4 = layout === 'a4'

  useEffect(() => {
    const targetScenario: LayoutScenario = isA4 ? 'print' : 'default'
    if (layoutScenario !== targetScenario) {
      setLayoutScenario(targetScenario)
    }
  }, [isA4, layoutScenario, setLayoutScenario])

  return (
    <div className="flex h-full w-full flex-1 justify-center overflow-auto bg-zinc-100/60 p-8 dark:bg-zinc-900">
      <div
        id="report-canvas-root"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          width: isA4 ? '794px' : '100%',
          transition: 'transform 0.2s ease-out',
        }}
        className="flex justify-center"
      >
        <DashboardGrid />
      </div>
    </div>
  )
}
