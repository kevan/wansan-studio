import { useSettingsStore } from '../stores/useSettingsStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useChatStore } from '../stores/useChatStore'
import { useLogStore } from '../stores/useLogStore'

export async function exportDebugLog() {
  const settings = useSettingsStore.getState()
  const files = useProjectStore.getState().files

  const chats = useChatStore.getState().messages
  const logs = await useLogStore.getState().getAllLogs()

  const report = {
    timestamp: new Date().toISOString(),
    app_info: {
      version: __APP_VERSION__,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    },
    settings: {
      ...settings,
      apiKey: 'REDACTED', // CRITICAL: Mask API Key
    },
    files: files.map(f => ({
      name: f.name,
      size: f.size,
      columns: f.columns.map(c => `${c.name} (${c.type})`).join(', '),
      // NO DATA ROWS
    })),
    recent_errors: chats
      .filter(m => m.status === 'error')
      .slice(-5)
      .map(m => ({
        id: m.id,
        error: m.error,
        sql: m.reportData?.sql || m.planSql,
      })),
    system_logs: logs, // CRITICAL ADDITION
  }

  // Convert to String
  const content = JSON.stringify(report, null, 2)

  if (window.electronAPI?.saveFile) {
    const result = await window.electronAPI.saveFile(
      content,
      'json',
      `wansan-debug-${Date.now()}.json`
    )
    if (result.success && result.data) {
        return result.data as string
    }
    return null
  } else {
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wansan-debug-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    return 'browser-download'
  }
}
