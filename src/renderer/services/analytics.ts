import { useSettingsStore } from '../stores/useSettingsStore'

const API_ENDPOINT = 'https://api.wansan.app/v1/ingest'

export const Analytics = {
  track: async (event: string, properties: Record<string, any> = {}) => {
    // Skip in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${event}`, properties)
      return
    }

    try {
      const { deviceId, isActivated, remoteConfig } = useSettingsStore.getState()
      const channel = remoteConfig?.channel || ''

      // Fire and forget - don't await response
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          deviceId,
          isActivated,
          channel,
          timestamp: Date.now(),
          version: __APP_VERSION__,
          platform: window.electronAPI.platform,
          ...properties,
        }),
      }).catch(err => console.error('Telemetry failed', err))
    } catch {
      // Fail silently
    }
  },
}
