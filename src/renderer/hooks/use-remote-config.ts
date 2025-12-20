import { useEffect, useRef } from 'react'
import { useSettingsStore, RemoteConfig } from '../stores/useSettingsStore'
import { useToastStore } from '../stores/useToastStore'
import semver from 'semver'
import { useTranslation } from 'react-i18next'

export function useRemoteConfig() {
  const setRemoteConfig = useSettingsStore(s => s.setRemoteConfig)
  const updateSettings = useSettingsStore(s => s.updateSettings)
  const dismissedAnnouncementId = useSettingsStore(
    s => s.dismissedAnnouncementId
  )
  const { addToast } = useToastStore()
  const { t } = useTranslation('common')
  const appVersion = __APP_VERSION__
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function fetchConfig() {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

      try {
        const res = await fetch('https://api.wansan.app/v1/config', {
          headers: { 'X-App-Version': appVersion },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          throw new Error(`API Error: HTTP ${res.status}`)
        }

        const data = await res.json()

        const config: RemoteConfig = {
          min_version: data.min_version,
          latest_version: data.latest_version,
          download_url: data.download_url,
          beta_code: data.beta_code,
          announcement: data.announcement,
          features: data.features,
        }

        setRemoteConfig(config)

        // Update validBetaCodes if present (backward compatibility / legacy field)
        if (Array.isArray(data.valid_beta_codes)) {
          updateSettings({ validBetaCodes: data.valid_beta_codes })
        }

        // 1. Force Update Check
        let isForceUpdate = false
        if (config.min_version && semver.lt(appVersion, config.min_version)) {
          isForceUpdate = true
          // Dispatch global event for the modal
          const event = new CustomEvent('force-update', {
            detail: {
              version: config.latest_version,
              url: config.download_url || 'https://wansan.app',
            },
          })
          document.dispatchEvent(event)
        }

        // 2. Soft Update Notification (Only if not force updating)
        if (
          !isForceUpdate &&
          config.latest_version &&
          semver.gt(config.latest_version, appVersion)
        ) {
          addToast({
            title: t('update_available', { version: config.latest_version }),
            description: t('update_available_desc'),
            type: 'info',
            duration: 8000,
          })
        }

        // 3. Announcement Check
        const currentDismissedId =
          useSettingsStore.getState().dismissedAnnouncementId
        const { language } = useSettingsStore.getState() // Get current language

        if (
          config.announcement &&
          config.announcement.id !== currentDismissedId
        ) {
          const rawText = config.announcement.text
          let displayText = ''

          if (typeof rawText === 'object') {
            // Try exact match -> fallback to English -> fallback to first key
            displayText =
              rawText[language] || rawText['en'] || Object.values(rawText)[0]
          } else {
            displayText = rawText
          }

          addToast({
            title:
              config.announcement.level === 'warning'
                ? t('announcement_important')
                : t('announcement_title'),
            description: displayText, // Use resolved text
            type: config.announcement.level === 'warning' ? 'error' : 'info',
            duration: 10000,
          })
        }
      } catch (e) {
        console.warn('Remote Config Failed (Offline Mode):', e)
        // Fail-open: keep existing local defaults. Do not lock the app.
        // The store is already initialized with defaults, so no action needed here.
        // If we want to show an offline indicator, we could set a state here.
      }
    }
    fetchConfig()
  }, [setRemoteConfig, addToast, appVersion, updateSettings])
}
