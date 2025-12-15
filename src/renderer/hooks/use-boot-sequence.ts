import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Analytics } from '../services/analytics'

export function useBootSequence() {
  const updateSettings = useSettingsStore(state => state.updateSettings)
  const deviceId = useSettingsStore(state => state.deviceId)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const boot = async () => {
      try {
        // 1. Get Device ID if missing
        let currentDeviceId = deviceId
        if (!currentDeviceId) {
          try {
            const res = await window.electronAPI.getDeviceId()
            if (res.success && res.data) {
              currentDeviceId = res.data
              updateSettings({ deviceId: currentDeviceId })
              console.log('[Boot] Device ID set:', currentDeviceId)
            }
          } catch (e) {
            console.warn('[Boot] Failed to get device ID via IPC:', e)
          }
        }
        
        // Config fetching is now handled by useRemoteConfig hook

        // Track App Launched
        Analytics.track("app_launched", {
          version: __APP_VERSION__,
          platform: window.electronAPI.platform,
          // deviceId and isActivated are read from useSettingsStore within Analytics.track
        });
        
      } catch (error) {
        console.error('[Boot] Sequence fatal error:', error)
      }
    }

    void boot()
  }, [deviceId, updateSettings]) 
}
