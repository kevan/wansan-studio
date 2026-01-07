import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, EChartsType } from 'echarts'
import { applyWansanTheme } from '../../../lib/echarts-theme'

interface ReportChartProps {
  option: EChartsOption
  className?: string
  style?: React.CSSProperties
  onChartClick?: (params: any) => void
  highlightedItems?: string[]
}

export function Chart({
  option,
  className,
  style,
  onChartClick,
  highlightedItems = [],
}: ReportChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<EChartsType | null>(null)

  useEffect(() => {
    const el = chartRef.current
    if (!el) return

    const instance = echarts.init(el)
    instanceRef.current = instance

    const resize = () => instance.resize()
    const observer = new ResizeObserver(() => resize())
    observer.observe(el)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      observer.disconnect()
      instance.dispose()
      instanceRef.current = null
    }
  }, [])

  // Bind/Unbind click listener separately
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance || !onChartClick) return

    const handler = (params: any) => {
      onChartClick(params)
    }

    instance.on('click', handler)
    return () => {
      instance.off('click', handler)
    }
  }, [onChartClick])

  useEffect(() => {
    if (!instanceRef.current) return
    const themedOption = applyWansanTheme(option)
    instanceRef.current.setOption(themedOption, { notMerge: true })
  }, [option])

  // Handle Highlights
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return

    // console.log('[Chart] Highlight Effect:', highlightedItems)

    // Always reset downplay first to ensure clean state
    instance.dispatchAction({
      type: 'downplay',
    })

    if (highlightedItems.length === 0) {
      instance.dispatchAction({
        type: 'hideTip',
      })
      // When clearing, we might want to also 'highlight' everything to restore normal opacity?
      // Actually, downplay alone dims things. To restore, we might need to downplay everything (which ECharts sometimes interprets as reset)
      // or simply do nothing if we want default state.
      // But ECharts behavior: 'downplay' with no target downplays everything.
      // 'highlight' with no target highlights everything.
      instance.dispatchAction({
        type: 'highlight',
      })
      return
    }

    // Highlight specific items by name (X-axis category or Pie sector name)
    // We try to match loosely (string vs number) because AI returns strings but data might be numbers
    instance.dispatchAction({
      type: 'highlight',
      name: highlightedItems,
    })
    
    // Also try numeric versions if items look like numbers
    const numericItems = highlightedItems
      .map(i => Number(i))
      .filter(n => !isNaN(n))
    
    if (numericItems.length > 0) {
       instance.dispatchAction({
        type: 'highlight',
        name: numericItems, // ECharts might support numbers for 'name' if data name is number? 
                            // Actually 'name' usually refers to category name which is string.
                            // But let's try dataIndex if we can map it? No, we don't have easy access to data here.
      })
    }

    // Show tooltip for first item
    if (highlightedItems[0]) {
      instance.dispatchAction({
        type: 'showTip',
        name: highlightedItems[0],
        position: undefined,
      })
    }
  }, [highlightedItems])

  return <div ref={chartRef} className={className} style={style} />
}
