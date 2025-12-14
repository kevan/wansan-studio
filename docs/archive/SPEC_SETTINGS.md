# 🛠️ Spec: Settings & Onboarding System (Final)

> **Version**: 2.0 (Post-Refactor)
> **Goal**: A robust, localized configuration system with multi-model support.
> **Status**: Ready for Implementation.

## 1. Store Architecture (`use-settings-store.ts`)

Manage user preferences and API secrets.

### 1.1 State Definition
```typescript
interface SettingsState {
  // 1. AI Configuration
  provider: 'openai' | 'deepseek' | 'moonshot' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;

  // 2. App Configuration
  language: 'en' | 'zh'; // Default: 'zh'
  // NOTE: Theme (Dark Mode) is REMOVED from MVP. Default is always Light.

  // 3. Onboarding State
  hasCompletedOnboarding: boolean;

  // Actions
  updateSettings: (patch: Partial<SettingsState>) => void;
  completeOnboarding: () => void;
  setProvider: (provider: string) => void; // Side-effect: Auto-fill baseUrl/model
}
```

### 1.2 Constants (`src/renderer/src/lib/constants.ts`)
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
  // ... Moonshot, Custom
};
```

## 2. Onboarding Wizard (`OnboardingFlow.tsx`)

**Crucial Logic**: Language selection MUST be the first step.

### 2.1 Flow Steps
1.  **Step 0: Language (The Gateway)**
    *   **UI**: Centered Split Screen or Large Cards.
    *   **Action**: Clicking `[ English ]` or `[ 简体中文 ]` sets `store.language` AND `i18n.changeLanguage`, then auto-advances to Step 1.
2.  **Step 1: AI Setup**
    *   **UI**: Form to select Provider and enter API Key.
    *   **Skip**: User can click "Skip for now" (sets `provider='custom'`, empty key).
3.  **Step 2: Ready**
    *   **Action**: "Start Using Wansan" -> `store.completeOnboarding()`.

## 3. Settings UI (`SettingsDialog.tsx`)

**Layout**: Single-Page Vertical Scrolling (No Tabs). Width ~700px.

### 3.1 Structure
*   **Header**: Title (Localized).
*   **Scroll Area**:
    *   **Section 1: AI Engine** (Expanded by default).
        *   Provider (Select).
        *   API Key (Input + Verify Button).
        *   Model (Select).
        *   Base URL (Input, auto-filled).
    *   **Separator**.
    *   **Section 2: Application**.
        *   Language (Select).
    *   **Separator**.
    *   **Section 3: About**.
        *   Version / Copyright.
*   **Style**:
    *   **Color System**: Strict Zinc/Black. No Orange.
    *   **Input**: `focus:border-black`, no rings.

## 4. i18n Strategy

*   **Lib**: `react-i18next`.
*   **Files**: `locales/{en,zh}/settings.json`.
*   **Keys Required**:
    *   `settings.title`
    *   `settings.section_ai`, `settings.section_app`
    *   `onboarding.welcome`, `onboarding.select_lang`
    *   `ai.provider`, `ai.api_key`, `ai.verify`

## 5. Integration

*   **App Root**: Check `!hasCompletedOnboarding` -> Render `<OnboardingFlow />`.
*   **Sidebar**: Footer "Settings" button -> Opens `<SettingsDialog />`.
