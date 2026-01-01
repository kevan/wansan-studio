import { describe, expect, it, beforeEach, vi } from 'vitest'

const createMemoryStorage = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  } as Storage
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMemoryStorage()
  })

  it('initializes with defaults', async () => {
    const { useSettingsStore } = await import('./useSettingsStore')
    const state = useSettingsStore.getState()
    expect(state.provider).toBe('deepseek')
    expect(state.apiKey).toBe('')
    expect(state.baseUrl).toBe('https://api.openai.com/v1')
    expect(state.model).toBeTruthy()
    expect(state.language).toBe('en')
    expect(state.hasCompletedOnboarding).toBe(false)
  })

  it('auto-updates baseUrl/model when provider changes', async () => {
    const { useSettingsStore } = await import('./useSettingsStore')
    useSettingsStore.getState().setProvider('deepseek')
    const state = useSettingsStore.getState()
    expect(state.provider).toBe('deepseek')
    expect(state.baseUrl).toBe('https://api.deepseek.com')
    expect(state.model).toBe('deepseek-chat')
  })

  it('updates settings via patch', async () => {
    const { useSettingsStore } = await import('./useSettingsStore')
    useSettingsStore
      .getState()
      .updateSettings({ model: 'gpt-4o-mini', language: 'en' })
    const state = useSettingsStore.getState()
    expect(state.model).toBe('gpt-4o-mini')
    expect(state.language).toBe('en')
  })

  it('marks onboarding complete', async () => {
    const { useSettingsStore } = await import('./useSettingsStore')
    useSettingsStore.getState().completeOnboarding()
    expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true)
  })

  it('persists to storage key', async () => {
    const { useSettingsStore, SETTINGS_STORAGE_KEY } =
      await import('./useSettingsStore')
    useSettingsStore.getState().updateSettings({ apiKey: 'sk-test' })
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string).state.apiKey).toBe('sk-test')
  })
})
