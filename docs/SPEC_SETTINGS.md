# 🛠️ Spec: Settings & Onboarding System (Enhanced)

> **Goal**: Establish a robust configuration management system with multi-provider support.
> **Scope**: Settings Store, Settings Dialog (Multi-Model), Onboarding Wizard, i18n Integration.

## 1. Store Architecture (`use-settings-store.ts`)

```typescript
interface SettingsState {
  // AI Configuration
  provider: 'openai' | 'deepseek' | 'moonshot' | 'custom'; // NEW
  apiKey: string;
  baseUrl: string;
  model: string;
  
  // App Config
  language: 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  hasCompletedOnboarding: boolean;

  // Actions
  setProvider: (p: string) => void; // Should auto-set baseUrl and default model
  // ... other actions
}
```

## 2. Constants (Model Presets)

Define these in `src/renderer/src/lib/constants.ts`:

```typescript
export const AI_PROVIDERS = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    getKeyUrl: "https://platform.openai.com/api-keys"
  },
  deepseek: {
    name: "DeepSeek (深度求索)",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-chat", "deepseek-coder"],
    getKeyUrl: "https://platform.deepseek.com/api_keys"
  },
  moonshot: {
    name: "Moonshot (Kimi)",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["moonshot-v1-8k", "moonshot-v1-32k"],
    getKeyUrl: "https://platform.moonshot.cn/console/api-keys"
  },
  custom: {
    name: "Custom / Proxy",
    baseUrl: "",
    models: [],
    getKeyUrl: ""
  }
};
```

## 3. UI Implementation (`SettingsDialog.tsx`)

### 3.1 AI Tab Layout
1.  **Provider Select**: Dropdown (`OpenAI`, `DeepSeek`, `Moonshot`, `Custom`).
    *   *Logic*: On change, auto-fill `Base URL` and switch `Model` dropdown options.
2.  **API Key Input**:
    *   *Helper*: "Don't have a key? [Get one here]({getKeyUrl}) ↗" (Dynamic Link).
3.  **Base URL Input**:
    *   *Logic*: Read-only if provider is NOT custom (optional, or allow override).
4.  **Model Select**:
    *   *Logic*: Populated from `AI_PROVIDERS[provider].models`.
    *   If `Custom`, allow free text input.

## 4. i18n Updates (`locales/{en,zh}/settings.json`)

```json
{
  "ai": {
    "provider_label": "AI Provider",
    "get_key_link": "Get API Key here",
    "custom_model_placeholder": "Enter model name (e.g., llama3)"
  }
}
```
