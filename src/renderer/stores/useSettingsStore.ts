import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AI_PROVIDERS, type AIProviderKey } from '@/src/lib/constants'
import { createBigIntStorage } from '@shared/serialization.ts'

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
  updateSettings: (
    patch: Partial<
      Omit<
        SettingsState,
        'setProvider' | 'updateSettings' | 'completeOnboarding' | 'resetSettings' | 'activateLicense'
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

const initialSettingsState: Omit<
  SettingsState,
  'setProvider' | 'updateSettings' | 'completeOnboarding' | 'resetSettings' | 'activateLicense'
> = {
  provider: 'openai',
  apiKey: '',
  ...getProviderDefaults('openai'),
  language: 'zh',
  hasCompletedOnboarding: false,
  isActivated: false,
}

export const SETTINGS_STORAGE_KEY = 'wansan-settings-v1'

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettingsState,
      setProvider: provider => {
        const defaults = getProviderDefaults(provider)
        set({ provider, ...defaults })
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
          const nextProvider = (patch as Partial<SettingsState>).provider
          if (nextProvider && nextProvider !== state.provider) {
            const defaults = getProviderDefaults(nextProvider)
            return { ...state, ...patch, provider: nextProvider, ...defaults }
          }
          return { ...state, ...patch }
        }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetSettings: () => set({ ...initialSettingsState }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createBigIntStorage(),
      version: 3,
      migrate: persistedState => {
        const state = persistedState as Partial<SettingsState> | undefined
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
        }
      },
    }
  )
)
