import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useToastStore } from '../stores/useToastStore'
import semver from 'semver'
import { useTranslation } from 'react-i18next'

export function useRemoteConfig() {
  const setRemoteConfig = useSettingsStore(s => s.setRemoteConfig)
  const dismissedAnnouncementId = useSettingsStore(s => s.dismissedAnnouncementId)
  const ignoredUpdateVersion = useSettingsStore(s => s.ignoredUpdateVersion)
  const dismissedRef = useRef<string | null>(null)
  const ignoredVersionRef = useRef<string | null>(null)

  // Keep refs in sync
  useEffect(() => {
    dismissedRef.current = useSettingsStore.getState().dismissedAnnouncementId
    ignoredVersionRef.current = useSettingsStore.getState().ignoredUpdateVersion
  }, [dismissedAnnouncementId, ignoredUpdateVersion])

  const { addToast } = useToastStore()
  const { t } = useTranslation('common')
  const appVersion = __APP_VERSION__ || '0.0.0'

  useEffect(() => {
    const unsub = window.electronAPI?.onRemoteConfig?.((config: any) => {
      console.log('[useRemoteConfig] Received config:', config)

      // ... (fallback logic)
      if (config.isSpecialFallback) {
        setRemoteConfig({ ...useSettingsStore.getState().remoteConfig })
        return
      }

      setRemoteConfig(config)

      // 1. Force Update Check
      if (config.min_version && semver.lt(appVersion, config.min_version)) {
        document.dispatchEvent(new CustomEvent('force-update', {
          detail: { version: config.latest_version, url: config.download_url || 'https://wansan.app' }
        }))
      }

      // 2. 软件更新提示
      if (
        config.latest_version &&
        semver.gt(config.latest_version, appVersion) &&
        config.latest_version !== ignoredVersionRef.current
      ) {
        addToast({
          title: t('update_available', { version: config.latest_version }),
          description: t('update_available_desc'),
          type: 'info',
          duration: 15000,
          action: {
            label: t('update_ignore'),
            onClick: () => {
              useSettingsStore.getState().ignoreUpdate(config.latest_version)
            },
          },
        })
      }

      // 3. 公告检查
      const { language } = useSettingsStore.getState()
      if (
        config.announcement &&
        config.announcement.id !== dismissedRef.current
      ) {
        const rawText = config.announcement.text
        const displayText =
          typeof rawText === 'object'
            ? rawText[language] || rawText[language.split('-')[0]] || rawText['en'] || Object.values(rawText)[0]
            : rawText

        if (displayText) {
          addToast({
            title:
              config.announcement.level === 'warning'
                ? t('announcement_important')
                : t('announcement_title'),
            description: displayText,
            type: config.announcement.level === 'warning' ? 'error' : 'info',
            duration: 15000,
            action: {
              label: t('announcement_dismiss'),
              onClick: () => {
                useSettingsStore
                  .getState()
                  .dismissAnnouncement(config.announcement.id)
              },
            },
          })
        }
      }
    })

    return () => unsub?.()
  }, [setRemoteConfig, addToast, appVersion, t])
}
