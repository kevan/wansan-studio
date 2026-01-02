import React from 'react'
import { VizHeader as A4HeaderUnified } from './viz/core/VizHeader'
import { VizSummary as A4SummaryUnified } from './viz/core/VizSummary'
import { VizChart as A4ChartUnified } from './viz/core/VizChart'

// A4 画布的各个区域组件
export function A4Header(props: any) {
  return <A4HeaderUnified {...props} showBorder={true} />
}

// 数据摘要组件
export function A4Summary(props: any) {
  return <A4SummaryUnified {...props} />
}

// ... (previous imports)

// 图表组件
export function A4Chart(props: any) {
  return <A4ChartUnified {...props} />
}
