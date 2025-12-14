# 🔐 Spec: Secure Storage (Keytar/DPAPI)

> **Goal**: Replace plain text `localStorage` with OS-level encrypted storage for sensitive keys.
> **Scope**: Main Process IPC + Renderer Hook.

## 1. Main Process (`src/main/ipc/secure.ts`)

Use Electron's `safeStorage` API.

*   **Channel**: `secure-storage`
*   **Methods**:
    *   `encrypt(key, value)`: Encrypts value using OS key, saves to disk (store).
    *   `decrypt(key)`: Reads from disk, decrypts using OS key.

**Fallback Strategy**:
If `safeStorage` is unavailable (e.g. Linux without Gnome Keyring), fallback to a simple obfuscation (Base64) but log a warning.

## 2. Renderer Implementation (`useSecureStorage`)

A hook that abstracts the IPC calls.

```typescript
const { setSecure, getSecure } = useSecureStorage();

// Usage
await setSecure('openai_key', 'sk-...');
const key = await getSecure('openai_key');
```

## 3. Migration Logic (Lazy Migration)

We won't force migration now.
*   **New Logic**: When user inputs API Key in Settings, save to Secure Storage.
*   **Read Logic**: Try Secure Storage first. If empty, try `localStorage` (legacy) -> if found, migrate to Secure and clear Local.
