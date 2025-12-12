import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AI_PROVIDERS, type AIProviderKey } from '@/src/lib/constants'

export type SettingsLanguage = 'en' | 'zh'

export interface SettingsState {
  provider: AIProviderKey
  apiKey: string
  baseUrl: string
  model: string
  language: SettingsLanguage
  hasCompletedOnboarding: boolean
  setProvider: (provider: AIProviderKey) => void
  updateSettings: (
    patch: Partial<
      Omit<
        SettingsState,
        'setProvider' | 'updateSettings' | 'completeOnboarding' | 'resetSettings'
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
  'setProvider' | 'updateSettings' | 'completeOnboarding' | 'resetSettings'
> = {
  provider: 'openai',
  apiKey: '',
  ...getProviderDefaults('openai'),
  language: 'zh',
  hasCompletedOnboarding: false,
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
      storage: createJSONStorage(() => localStorage),
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
        }
      },
    }
  )
)
