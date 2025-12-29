import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AI_PROVIDERS, type AIProviderKey } from '@/src/lib/constants'
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
  validBetaCodes: string[]
  remoteConfig: RemoteConfig
  dismissedAnnouncementId: string | null
  domainRules: DomainRule[]
  recentProjectPaths: string[]
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
> = {
  provider: 'deepseek',
  apiKey: '',
  ...getProviderDefaults('deepseek'),
  language: detectDefaultLanguage(),
  hasCompletedOnboarding: false,
  isActivated: false,
  validBetaCodes: [],
  remoteConfig: {},
  dismissedAnnouncementId: null,
  domainRules: [],
  recentProjectPaths: [],
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
        const { validBetaCodes, remoteConfig } = get()
        const normalizedCode = code.trim().toUpperCase()

        // Check dynamic list
        if (validBetaCodes.includes(normalizedCode)) {
          set({ isActivated: true })
          Analytics.track('beta_activated', {
            code_prefix: normalizedCode.substring(0, 6),
          })
          return true
        }

        // Check remote config beta_code
        if (
          remoteConfig.beta_code &&
          remoteConfig.beta_code.toUpperCase() === normalizedCode
        ) {
          set({ isActivated: true })
          Analytics.track('beta_activated', {
            code_prefix: normalizedCode.substring(0, 6),
          })
          return true
        }

        return false
      },
      setRemoteConfig: (cfg: RemoteConfig) => set({ remoteConfig: cfg }),
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
          const filtered = (state.recentProjectPaths || []).filter(p => p !== path)
          const newList = [path, ...filtered].slice(0, 10)
          return { recentProjectPaths: newList }
        }),
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
          validBetaCodes: state.validBetaCodes,
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
        const { apiKey, ...rest } = state
        return rest
      },
      migrate: persistedState => {
        const state = persistedState as Partial<SettingsState> | undefined
        if (!state) return initialSettingsState as any

        const provider = (state.provider ?? 'openai') as AIProviderKey
        const defaults = getProviderDefaults(provider)
        return {
          ...initialSettingsState,
          ...state,
          provider,
          baseUrl: state.baseUrl ?? defaults.baseUrl,
          model: state.model ?? defaults.model,
          isActivated: state.isActivated ?? false,
          remoteConfig: state.remoteConfig ?? {},
          dismissedAnnouncementId: state.dismissedAnnouncementId ?? null,
        } as any
      },
    }
  )
)
