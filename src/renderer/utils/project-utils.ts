import { Session } from '@shared/types/project'
import { ReportData } from '@shared/types/dashboard'

/**
 * 清理 widgetRegistry，移除未被引用的条目。
 * 规则：
 * 1. 收集所有 session 中 messages 和 dashboard.widgets 引用的 widgetId。
 * 2. 对于 registry 中的 text 类型条目：必须被 dashboard 引用才保留。
 * 3. 对于其他类型条目：被 messages 或 dashboard 引用即保留。
 */
export function getCleanedRegistry(
  registry: Record<string, ReportData>,
  sessions: Session[]
): Record<string, ReportData> {
  const referencedInMessages = new Set<string>()
  const referencedInDashboard = new Set<string>()

  sessions.forEach(s => {
    // 收集消息中的引用
    s.messages.forEach(m => {
      if (m.widgetId) referencedInMessages.add(m.widgetId)
    })
    // 收集看板中的引用
    s.dashboard.widgets.forEach(w => {
      if (w.widgetId) referencedInDashboard.add(w.widgetId)
    })
  })

  const cleaned: Record<string, ReportData> = {}

  Object.entries(registry).forEach(([id, data]) => {
    if (!data || typeof data !== 'object') return

    const isText = data.chartType === 'text'
    const isInDashboard = referencedInDashboard.has(id)
    const isInMessages = referencedInMessages.has(id)

    if (isText) {
      // 文本组件：必须在看板中（因为消息中通常不保留文本块的原始数据引用，或我们希望它随看板删除而清理）
      if (isInDashboard) {
        cleaned[id] = data
      }
    } else {
      // 图表/表格：在消息或看板中均可
      if (isInDashboard || isInMessages) {
        cleaned[id] = data
      }
    }
  })

  return cleaned
}
