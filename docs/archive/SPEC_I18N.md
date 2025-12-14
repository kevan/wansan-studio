# 🛠️ Spec: Internationalization (i18n)

> **Goal**: Support switching between English and Chinese (Simplified).
> **Scope**: UI Text, AI System Prompts, Error Messages.

## 1. Stack Selection
*   `i18next`: Core logic.
*   `react-i18next`: React bindings.
*   `i18next-browser-languagedetector`: Auto-detect language.

## 2. Store Updates (`use-workbench-store.ts`)

Add language preference to the persistent store.

```typescript
type Language = 'en' | 'zh';

interface WorkbenchState {
  // ...
  language: Language;
  setLanguage: (lang: Language) => void;
}
```

## 3. Architecture

### 3.1 Directory Structure
```text
src/renderer/src/locales/
  ├── en/
  │   ├── common.json   // General UI (Buttons, Headers)
  │   ├── chat.json     // Chat interface
  │   └── analysis.json // AI Prompts & Results
  └── zh/
      ├── common.json
      ├── chat.json
      └── analysis.json
```

### 3.2 AI Prompt Injection (`src/main/engine/ai-bridge.ts`)
The Backend needs to know the target language to instruct the LLM.

*   **Action**: Pass `language` param from Frontend -> `generatePlan`.
*   **Prompt**: Append to System Prompt:
    > "OUTPUT RULE: The 'summary', 'title', and 'reasoning' fields MUST be in ${targetLanguage} language."

## 4. Implementation Steps

1.  **Install**: `npm install i18next react-i18next i18next-browser-languagedetector`.
2.  **Config**: Create `src/renderer/src/i18n.ts` and initialize.
3.  **UI Migration**: Replace hardcoded strings with `t('key')`.
    *   *Priority*: Sidebar, Headers, Dashboard Controls.
4.  **AI Integration**: Update `generatePlan` signature to accept `lang`.
