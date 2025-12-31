import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AI_PROVIDERS,
  type AIProviderKey,
  DEFAULT_SPECIAL_EXPIRY,
} from '@/src/lib/constants'
import { createBigIntStorage } from '@shared/serialization.ts'
import type { AIConfig, DomainRule } from '@shared/types'
import { Analytics } from '../services/analytics'

export type SettingsLanguage = 'en' | 'zh'

export interface AIProviderConfig {
  name: string
  baseUrl: string
  models: string[]
  getKeyUrl?: string
}

export interface RemoteConfig {
  min_version?: string
  latest_version?: string
  download_url?: string
  beta_code?: string
  specialExpiry?: string
  channel?: string
  isActivated?: boolean
  announcement?: {
    id: string
    text: string | { [lang: string]: string }
    link?: string
    level?: 'info' | 'warning'
  } | null
  features?: Record<string, boolean>
  providers?: Record<string, AIProviderConfig>
}

export interface SettingsState {
  provider: AIProviderKey
  apiKey: string
  baseUrl: string
  model: string
  language: SettingsLanguage
  hasCompletedOnboarding: boolean
  isActivated: boolean
  deviceId?: string
  remoteConfig: RemoteConfig
  dismissedAnnouncementId: string | null
  domainRules: DomainRule[]
  recentProjectPaths: string[]
  isSpecialChannel: boolean
  isExpired: boolean
  setProvider: (provider: AIProviderKey) => void
  activateLicense: (code: string) => boolean
  loadSensitiveData: () => Promise<void>
  setRemoteConfig: (cfg: RemoteConfig) => void
  dismissAnnouncement: (id: string) => void
  addDomainRule: (content: string) => void
  toggleDomainRule: (id: string) => void
  removeDomainRule: (id: string) => void
  updateDomainRule: (id: string, content: string) => void
  reorderDomainRules: (oldIndex: number, newIndex: number) => void
  addRecentProject: (path: string) => void
  removeRecentProject: (path: string) => void
  updateSettings: (
    patch: Partial<
      Omit<
        SettingsState,
        | 'setProvider'
        | 'updateSettings'
        | 'completeOnboarding'
        | 'resetPreferences'
        | 'activateLicense'
        | 'loadSensitiveData'
        | 'setRemoteConfig'
        | 'dismissAnnouncement'
      >
    >
  ) => void
  completeOnboarding: () => void
  resetPreferences: () => void
}

const checkExpiry = (
  remoteConfig: RemoteConfig
): { isSpecial: boolean; isExpired: boolean; shouldActivate: boolean } => {
  // 核心变更：完全依赖后端下发的 channel 字段
  const channel = remoteConfig.channel
  const isSpecial = typeof channel === 'string' && channel.length > 0

  if (!isSpecial)
    return { isSpecial: false, isExpired: false, shouldActivate: false }

  const expiryDateStr = remoteConfig.specialExpiry || DEFAULT_SPECIAL_EXPIRY
  const expiryDate = new Date(expiryDateStr)
  const isExpired = new Date() > expiryDate

  return {
    isSpecial: true,
    isExpired,
    shouldActivate: !isExpired,
  }
}

const getProviderDefaults = (provider: AIProviderKey) => {
  const config = AI_PROVIDERS[provider]
  const defaultModel = config.models[0] ?? ''
  return { baseUrl: config.baseUrl, model: defaultModel }
}

const detectDefaultLanguage = (): 'en' | 'zh' => {
  const lang = navigator.language || 'en'
  // Match 'zh', 'zh-CN', 'zh-TW' -> 'zh'
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const initialSettingsState: Omit<
  SettingsState,
  | 'setProvider'
  | 'updateSettings'
  | 'completeOnboarding'
  | 'resetPreferences'
  | 'activateLicense'
  | 'loadSensitiveData'
  | 'setRemoteConfig'
  | 'dismissAnnouncement'
  | 'addDomainRule'
  | 'toggleDomainRule'
  | 'removeDomainRule'
  | 'updateDomainRule'
  | 'reorderDomainRules'
  | 'addRecentProject'
  | 'removeRecentProject'
> = {
  provider: 'deepseek',
  apiKey: '',
  ...getProviderDefaults('deepseek'),
  language: detectDefaultLanguage(),
  hasCompletedOnboarding: false,
  isActivated: false,
  remoteConfig: {},
  dismissedAnnouncementId: null,
  domainRules: [],
  recentProjectPaths: [],
  isSpecialChannel: false,
  isExpired: false,
}

export const SETTINGS_STORAGE_KEY = 'wansan-settings-v1'

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettingsState,
      loadSensitiveData: async () => {
        try {
          const res = await window.electronAPI.secureGet('apiKey')
          if (res.success && res.data) {
            set({ apiKey: res.data })
            // Also update main process config
            const current = get()
            const aiConfig: AIConfig = {
              apiKey: res.data,
              baseURL: current.baseUrl,
              model: current.model,
            }
            void window.electronAPI.setAIConfig(aiConfig)
          }
        } catch (e) {
          console.error('Failed to load sensitive data', e)
        }
      },
      setProvider: provider => {
        const defaults = getProviderDefaults(provider)
        set({ provider, ...defaults })
        const currentSettings = get()
        if (currentSettings.apiKey) {
          const aiConfig: AIConfig = {
            apiKey: currentSettings.apiKey,
            baseURL: defaults.baseUrl,
            model: defaults.model,
          }
          void window.electronAPI.setAIConfig(aiConfig)
        }
      },
      activateLicense: (code: string) => {
        const { remoteConfig } = get()
        const normalizedCode = code.trim().toUpperCase()
        if (!normalizedCode) return false

        const rawCodes = remoteConfig.beta_code
        const validCodes = Array.isArray(rawCodes)
          ? rawCodes.map(c => c.toUpperCase())
          : [rawCodes?.toUpperCase() || '']

        if (validCodes.includes(normalizedCode)) {
          set({ isActivated: true })
          Analytics.track('beta_activated', {
            code_prefix: normalizedCode.substring(0, 6),
          })
          return true
        }
        return false
      },
      setRemoteConfig: (cfg: RemoteConfig) => {
        const { isSpecial, isExpired, shouldActivate } = checkExpiry(cfg)
        set(state => {
          // 基础状态
          let newIsActivated = state.isActivated

          // 1. 特殊渠道：完全由后端/环境决定
          if (isSpecial) {
            newIsActivated = shouldActivate
          }
          // 2. 普通渠道 (后端下发了明确指令)：覆盖本地
          else if ((cfg as any).isActivated !== undefined) {
            newIsActivated = (cfg as any).isActivated
          }
          // 3. 普通渠道 (后端无指令)：保持本地状态 (isActivated 持久化生效)

          const newState: Partial<SettingsState> = {
            remoteConfig: cfg,

            isSpecialChannel: isSpecial,

            isExpired: isExpired,

            isActivated: newIsActivated,
          }

          return newState
        })
      },

      dismissAnnouncement: (id: string) => set({ dismissedAnnouncementId: id }),

      addDomainRule: content => {
        Analytics.track('domain_rule_added', { scope: 'global' })
        set(state => ({
          domainRules: [
            ...state.domainRules,
            {
              id: crypto.randomUUID(),
              content,
              isEnabled: true,
              createdAt: Date.now(),
            },
          ],
        }))
      },
      toggleDomainRule: id =>
        set(state => ({
          domainRules: state.domainRules.map(r =>
            r.id === id ? { ...r, isEnabled: !r.isEnabled } : r
          ),
        })),
      removeDomainRule: id =>
        set(state => ({
          domainRules: state.domainRules.filter(r => r.id !== id),
        })),
      updateDomainRule: (id, content) =>
        set(state => ({
          domainRules: state.domainRules.map(r =>
            r.id === id ? { ...r, content } : r
          ),
        })),
      reorderDomainRules: (oldIndex, newIndex) =>
        set(state => {
          const newRules = [...state.domainRules]
          const [removed] = newRules.splice(oldIndex, 1)
          newRules.splice(newIndex, 0, removed)
          return { domainRules: newRules }
        }),
      addRecentProject: path =>
        set(state => {
          const filtered = (state.recentProjectPaths || []).filter(
            p => p !== path
          )
          const newList = [path, ...filtered].slice(0, 10)
          return { recentProjectPaths: newList }
        }),
      removeRecentProject: path =>
        set(state => ({
          recentProjectPaths: (state.recentProjectPaths || []).filter(
            p => p !== path
          ),
        })),
      updateSettings: patch =>
        set(state => {
          let nextState = { ...state, ...patch }
          const nextProvider = (patch as Partial<SettingsState>).provider

          if (nextProvider && nextProvider !== state.provider) {
            const defaults = getProviderDefaults(nextProvider)
            nextState = {
              ...state,
              ...patch,
              provider: nextProvider,
              ...defaults,
            }
          }

          if ((patch as Partial<SettingsState>).apiKey !== undefined) {
            const newKey = (patch as Partial<SettingsState>).apiKey
            if (newKey !== undefined) {
              void window.electronAPI.secureSet('apiKey', newKey)
            }
          }

          const aiSettingsChanged =
            (patch as Partial<SettingsState>).apiKey !== undefined ||
            (patch as Partial<SettingsState>).baseUrl !== undefined ||
            (patch as Partial<SettingsState>).model !== undefined ||
            nextProvider !== undefined

          if (aiSettingsChanged && nextState.apiKey) {
            const aiConfig: AIConfig = {
              apiKey: nextState.apiKey,
              baseURL: nextState.baseUrl,
              model: nextState.model,
            }
            void window.electronAPI.setAIConfig(aiConfig)
          }

          return nextState
        }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetPreferences: () => {
        set(state => ({
          // Reset Preferences
          language: detectDefaultLanguage(),
          // Preserve License & Config
          isActivated: state.isActivated,
          apiKey: state.apiKey,
          deviceId: state.deviceId,
          remoteConfig: state.remoteConfig,
          provider: state.provider, // Preserve AI Provider choice too? Usually yes for "Preferences".
          // If user wants to reset AI, they can clear manually or we might need separate action.
          // The prompt said "Only clears UI preferences (Theme, Language), preserving License and Config"
          // AI Config (provider, baseurl, model) is technically config.
          // So I should preserve them.
          baseUrl: state.baseUrl,
          model: state.model,
          dismissedAnnouncementId: state.dismissedAnnouncementId,
        }))
        // Do NOT clear secure storage apiKey
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createBigIntStorage(),
      version: 3,
      partialize: state => {
        // 从持久化存储中排除以下敏感或瞬时字段
        // 注意：isActivated 现在允许持久化（公测阶段便利性）
        const { apiKey, remoteConfig, isSpecialChannel, isExpired, ...rest } =
          state
        return rest
      },
      migrate: persistedState => {
        const state = persistedState as Partial<SettingsState> | undefined
        if (!state) return initialSettingsState as any

        const provider = (state.provider ?? 'openai') as AIProviderKey
        const defaults = getProviderDefaults(provider)
        const remoteConfig = state.remoteConfig ?? {}
        const { isSpecial, isExpired, shouldActivate } =
          checkExpiry(remoteConfig)

        return {
          ...initialSettingsState,
          ...state,
          provider,
          baseUrl: state.baseUrl ?? defaults.baseUrl,
          model: state.model ?? defaults.model,
          isActivated: shouldActivate || (state.isActivated ?? false),
          remoteConfig,
          isSpecialChannel: isSpecial,
          isExpired: isExpired,
          dismissedAnnouncementId: state.dismissedAnnouncementId ?? null,
        } as any
      },
    }
  )
)
