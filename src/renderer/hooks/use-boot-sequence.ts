import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Analytics } from '../services/analytics'

const CONFIG_API_URL = 'https://api.wansan.app/v1/config'

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

        // 2. Fetch Config
        try {
            const response = await fetch(CONFIG_API_URL, {
                headers: {
                    'X-Device-Id': currentDeviceId || 'unknown'
                }
            })
            
            if (!response.ok) {
                 throw new Error(`HTTP ${response.status}`)
            }
            
            const data = await response.json()
            console.log('[Boot] Config fetched:', data)
            
            // 3. Update Store with remote config
            // Assuming API returns snake_case, mapping to camelCase
            if (data && Array.isArray(data.valid_beta_codes)) {
               updateSettings({ validBetaCodes: data.valid_beta_codes })
            }
        } catch (netError) {
             console.warn('[Boot] Config fetch failed, using defaults.', netError)
        }
        
        // Track App Launched
        Analytics.track("app_launched", {
          version: "1.0.1", // TODO: dynamically get version
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
