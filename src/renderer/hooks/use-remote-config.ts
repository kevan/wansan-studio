import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
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
  const appVersion = __APP_VERSION__ || '0.0.0'
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // 核心安全变更：不再在前端发起 fetch
    // 而是通过 Electron 提供的订阅机制接收主进程（后端）下发的安全配置
    const unsub = window.electronAPI?.onRemoteConfig?.((config: any) => {
      console.log(
        '[useRemoteConfig] Received verified config from Main Process'
      )

      // 处理特殊渠道的回退逻辑（当网络请求失败但本地环境变量存在时）
      if (config.isSpecialFallback) {
        setRemoteConfig({ ...useSettingsStore.getState().remoteConfig })
        return
      }

      setRemoteConfig(config)

      if (Array.isArray(config.valid_beta_codes)) {
        updateSettings({ validBetaCodes: config.valid_beta_codes })
      }

      // 1. 强制更新检查
      if (config.min_version && semver.lt(appVersion, config.min_version)) {
        const event = new CustomEvent('force-update', {
          detail: {
            version: config.latest_version,
            url: config.download_url || 'https://wansan.app',
          },
        })
        document.dispatchEvent(event)
      }

      // 2. 软件更新提示
      if (
        config.latest_version &&
        semver.gt(config.latest_version, appVersion)
      ) {
        addToast({
          title: t('update_available', { version: config.latest_version }),
          description: t('update_available_desc'),
          type: 'info',
          duration: 10000,
          action: {
            label: t('download'),
            onClick: () => {
              const url = config.download_url || 'https://wansan.app'
              window.electronAPI?.openExternal?.(url)
            },
          },
        })
      }

      // 3. 公告检查
      const { language } = useSettingsStore.getState()
      if (
        config.announcement &&
        config.announcement.id !== dismissedAnnouncementId
      ) {
        const rawText = config.announcement.text
        const displayText =
          typeof rawText === 'object'
            ? rawText[language] || rawText['en'] || Object.values(rawText)[0]
            : rawText

        addToast({
          title:
            config.announcement.level === 'warning'
              ? t('announcement_important')
              : t('announcement_title'),
          description: displayText,
          type: config.announcement.level === 'warning' ? 'error' : 'info',
          duration: 10000,
        })
      }
    })

    return () => unsub?.()
  }, [
    setRemoteConfig,
    addToast,
    appVersion,
    updateSettings,
    dismissedAnnouncementId,
    t,
  ])
}
