# 🛠️ Spec: Client-Cloud Integration

> **Goal**: Connect Electron App to `api.wansan.app` for dynamic config and device identity.

## 1. Device Identity (`node-machine-id`)

We need a persistent, unique ID for the machine.

*   **Lib**: `node-machine-id`
*   **Storage**: `useSettingsStore.deviceId` (Persisted).
*   **Logic**: On first run (if `deviceId` is empty), generate and save it.

## 2. Remote Configuration (Feature Flags)

Replace hardcoded Beta Code with Cloud fetch.

*   **Hook**: `useRemoteConfig`
*   **Trigger**: App Launch (useEffect in `App.tsx` or `MainLayout`).
*   **Endpoint**: `GET https://api.wansan.app/v1/config` (or your worker URL).
*   **Logic**:
    1.  Fetch JSON.
    2.  Update `useSettingsStore.validBetaCodes` with the array from cloud.
    3.  (Optional) Show announcement toast if exists.

## 3. Store Updates (`useSettingsStore.ts`)

```typescript
interface SettingsState {
  // ...
  deviceId: string;
  validBetaCodes: string[]; // Replaces hardcoded check
  
  setDeviceId: (id: string) => void;
  updateRemoteConfig: (config: any) => void;
}
```
