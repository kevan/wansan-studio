import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AI_PROVIDERS, type AIProviderKey } from '@/src/lib/constants'
import { createBigIntStorage } from '@shared/serialization.ts'
import type { AIConfig } from '@shared/types'

export type SettingsLanguage = 'en' | 'zh'

export interface SettingsState {
  provider: AIProviderKey
  apiKey: string
  baseUrl: string
  model: string
  language: SettingsLanguage
  hasCompletedOnboarding: boolean
  isActivated: boolean
  setProvider: (provider: AIProviderKey) => void
  activateLicense: (code: string) => boolean
  loadSecureSettings: () => Promise<void>
  updateSettings: (
    patch: Partial<
      Omit<
        SettingsState,
        'setProvider' | 'updateSettings' | 'completeOnboarding' | 'resetSettings' | 'activateLicense' | 'loadSecureSettings'
      >
    >
  ) => void
  completeOnboarding: () => void
  resetSettings: () => void
}

const getProviderDefaults = (provider: AIProviderKey) => {
  const config = AI_PROVIDERS[provider]
  const defaultModel = config.models[0] ?? ''
  return { baseUrl: config.baseUrl, model: defaultModel }
}

const detectDefaultLanguage = (): 'en' | 'zh' => {
  const lang = navigator.language || 'en';
  // Match 'zh', 'zh-CN', 'zh-TW' -> 'zh'
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

const initialSettingsState: Omit<
  SettingsState,
  'setProvider' | 'updateSettings' | 'completeOnboarding' | 'resetSettings' | 'activateLicense' | 'loadSecureSettings'
> = {
  provider: 'openai',
  apiKey: '',
  ...getProviderDefaults('openai'),
  language: detectDefaultLanguage(),
  hasCompletedOnboarding: false,
  isActivated: false,
}

export const SETTINGS_STORAGE_KEY = 'wansan-settings-v1'

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettingsState,
      
      loadSecureSettings: async () => {
        try {
          const apiKey = await window.electronAPI.secureGet('apiKey')
          if (apiKey) {
            set({ apiKey })
            // Sync to main process runtime config
            const current = get()
            const aiConfig: AIConfig = {
              apiKey,
              baseURL: current.baseUrl,
              model: current.model,
            }
            void window.electronAPI.setAIConfig(aiConfig)
          }
        } catch (error) {
          console.error('Failed to load secure settings:', error)
        }
      },

      setProvider: provider => {
        const defaults = getProviderDefaults(provider)
        set({ provider, ...defaults })
        // Call main process to update AI config
        const currentSettings = get()
        const aiConfig: AIConfig = {
          apiKey: currentSettings.apiKey,
          baseURL: defaults.baseUrl, // Use default baseUrl for the provider
          model: defaults.model, // Use default model for the provider
        }
        void window.electronAPI.setAIConfig(aiConfig)
      },
      activateLicense: (code: string) => {
        const validCodes = ['WANSAN-BETA', 'INTERNAL-TEST']
        // Simple case-insensitive check
        if (validCodes.includes(code.trim().toUpperCase())) {
          set({ isActivated: true })
          return true
        }
        return false
      },
      updateSettings: patch =>
        set(state => {
          let nextState = { ...state, ...patch }
          const nextProvider = (patch as Partial<SettingsState>).provider

          if (nextProvider && nextProvider !== state.provider) {
            const defaults = getProviderDefaults(nextProvider)
            nextState = { ...state, ...patch, provider: nextProvider, ...defaults }
          }

          // Secure storage side effect
          const patchKey = (patch as Partial<SettingsState>).apiKey
          if (patchKey !== undefined) {
             // Fire and forget
             void window.electronAPI.secureSet('apiKey', patchKey)
          }

          // Call main process to update AI config if relevant settings changed
          const aiSettingsChanged = (
            (patch as Partial<SettingsState>).apiKey !== undefined ||
            (patch as Partial<SettingsState>).baseUrl !== undefined ||
            (patch as Partial<SettingsState>).model !== undefined ||
            nextProvider !== undefined
          )

          if (aiSettingsChanged) {
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
      resetSettings: () => set({ ...initialSettingsState }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createBigIntStorage(),
      version: 3,
      partialize: (state) => {
        // Exclude apiKey and methods from localStorage persistence
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { apiKey, setProvider, activateLicense, loadSecureSettings, updateSettings, completeOnboarding, resetSettings, ...rest } = state
        return rest
      },
      migrate: persistedState => {
        const state = persistedState as Partial<Omit<SettingsState, 'setProvider' | 'activateLicense' | 'loadSecureSettings' | 'updateSettings' | 'completeOnboarding' | 'resetSettings' | 'apiKey'>> | undefined
        if (!state) return initialSettingsState

        const provider = (state.provider ?? 'openai') as AIProviderKey
        const defaults = getProviderDefaults(provider)
        return {
          ...initialSettingsState,
          ...state,
          provider,
          baseUrl: state.baseUrl ?? defaults.baseUrl,
          model: state.model ?? defaults.model,
          isActivated: state.isActivated ?? false,
          // apiKey will be loaded asynchronously
        }
      },
    }
  )
)