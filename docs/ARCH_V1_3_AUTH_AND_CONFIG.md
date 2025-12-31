# Architecture: V1.3 Auth & Configuration

> **Version**: 1.0 (Final)
> **Date**: 2025-12-30
> **Scope**: Authentication, Remote Config, AI Service Persistence.

## 1. Authentication Architecture (双轨制授权)

The system supports two distinct operational modes determined at startup.

### 1.1 Standard Mode (Public Beta)
*   **Target**: General users downloading from the website.
*   **Activation**: User inputs a Beta Code.
*   **Validation**: 
    *   Frontend checks the code against `remoteConfig.beta_code` (array/string).
    *   If match -> `isActivated = true` stored in **Frontend LocalStorage**.
*   **Persistence**: Frontend responsible for persisting activation status during the Beta phase.
*   **Offline**: Works if `isActivated` was previously persisted.

### 1.2 Enterprise Mode (Special Channel)
*   **Target**: Corporate clients or specific events.
*   **Identification**: Built with `VITE_SPECIAL_CHANNEL` env var.
*   **Activation**: **Automatic**.
*   **Expiry Control**:
    *   **Source**: Remote Config (`special_expiry`) > Local Cache (Electron Store) > Hardcoded Default.
    *   **Logic**: Main Process calculates `isExpired`. If expired, activation is revoked.
*   **Persistence**: Expiry date persisted in **Main Process (Encrypted Store)**. Frontend does NOT persist sensitive auth flags.

---

## 2. Configuration Management (配置管理)

### 2.1 AI Configuration
*   **Storage Location**: 
    *   **API Key**: System Secure Storage (Keychain/DPAPI) via `secure-storage.ts`.
    *   **Model/BaseURL**: Encrypted File Storage (`wansan-ai-config.json`) via `electron-store`.
*   **Migration**: On startup, `useSettingsStore` checks for legacy config in localStorage. If found, it pushes it to the Main Process via `setAIConfig`.

### 2.2 Managed AI (Built-in Config)
*   **Injection**: Env vars injected at build time (`VITE_BUILTIN_API_KEY` etc.).
*   **Security**: API Key is AES-GCM encrypted (using `scripts/obfuscate-tool.js`) before injection. Decrypted only in Main Process memory.
*   **UI Behavior**: Settings dialog shows "Enterprise Managed" badge; inputs are disabled; Key is masked (`******`).

---

## 3. Data Flow

### Startup Sequence
1.  **Main**: `AuthService` initializes, checks Env, reads Local Store.
2.  **Main**: `AIService` initializes, reads Secure Storage & Config Store.
3.  **Main -> Remote**: Fetch `config` (Headers: Channel, Version).
4.  **Main -> Renderer**: Send `AppConfig` (Remote + Auth State).
5.  **Renderer**: 
    *   Hydrate Store.
    *   Check for Legacy AI Config -> `setAIConfig` (Migration).
    *   Update UI based on `isActivated` and `channel`.

### User Modification
1.  **Renderer**: User changes Model/Key.
2.  **Renderer -> Main**: `setAIConfig(newConfig)`.
3.  **Main**: `AIService` updates Secure Storage & File Store.

---

## 4. Security Measures

1.  **No Plaintext Keys**: API Keys never stored in plain JSON files.
2.  **Frontend Isolation**: Frontend persistence excludes `apiKey`, `channel`, `special_expiry`.
3.  **Transport**: License/Channel info sent via HTTP Headers, not URL params.
4.  **Encryption**: Local config files encrypted with AES-256.
