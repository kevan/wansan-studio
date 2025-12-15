import { useSettingsStore } from '../stores/useSettingsStore'

const API_ENDPOINT = 'https://api.wansan.app/v1/ingest'

export const Analytics = {
  track: async (event: string, properties: Record<string, any> = {}) => {
    try {
      const { deviceId, isActivated } = useSettingsStore.getState()

      // Fire and forget - don't await response
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          deviceId,
          isActivated,
          timestamp: Date.now(),
          ...properties,
        }),
      }).catch(err => console.error('Telemetry failed', err))
    } catch (e) {
      // Fail silently
    }
  },
}
