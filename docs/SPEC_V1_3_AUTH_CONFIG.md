# SPEC: V1.3 Auth & Configuration Architecture

> **Status**: Implementation Ready
> **Version**: 1.3.1
> **Context**: "Local-First" Beta Code validation + Special Channel Injection.

## 1. Core Philosophy

The system distinguishes between two operational modes managed by the **Main Process**:

1.  **Standard Mode**: Users input a License Key. Validation is strictly **Local**, matching against a list of `validBetaCodes` (which is updated via Remote Config).
2.  **Special Mode**: Pre-configured builds. Activation is **Automatic** based on Channel ID, with an optional remote Expiry Date check.

---

## 2. Authentication Logic (Current Implementation)

### 2.1 The Flow

#### A. Startup Check (`auth-service.ts`)

1.  **Identity Check**:
    *   Read `process.env.VITE_SPECIAL_CHANNEL`.
    *   Read `licenseKey` from Secure Storage.
    *   Read `isActivated` from `electron-store`.

2.  **Remote Fetch**:
    *   Fetch `GET /config`.
    *   **Goal**: Get latest `valid_beta_codes` list and `special_expiry` date.
    *   **NO Auth**: We do NOT ask the server "Is this key valid?".

3.  **Decision Logic**:

    *   **Special Channel**:
        *   `Now < Expiry ? Activated : Expired`.
    *   **Standard User**:
        *   **Check**: Does `licenseKey` exist in `validBetaCodes` (Merged Remote + Local Cache)?
        *   **Yes**: `isActivated = true` (Persist to Store).
        *   **No**: Fallback to `electron-store.get('isActivated')`.

### 2.2 Activation Action (`activateLicense` IPC)

1.  **User Input**: Frontend sends Key to Main.
2.  **Save**: Main saves Key to `secure-storage`.
3.  **Validate**: Main checks Key against cached `validBetaCodes`.
4.  **Result**: If match, update `electron-store` and notify Frontend.

---

## 3. Built-in AI Configuration (Managed Mode)

For Special Channels, we inject a full AI configuration suite.

### 3.1 Injection Strategy (Build Time)

Env variables (Base64 encoded where sensitive):
*   `VITE_BUILTIN_PROVIDER`
*   `VITE_BUILTIN_BASE_URL`
*   `VITE_BUILTIN_MODELS`
*   `VITE_BUILTIN_API_KEY` (AES-GCM Encrypted recommended, Base64 supported)

### 3.2 Runtime Isolation

*   **Frontend**: Receives masked config (`apiKey: ******`). Inputs disabled.
*   **Backend**: `AIService` uses the real internal key for requests.

---

## 4. Roadmap: The "True" Auth System (Future V2.0)

> **Goal**: Replace the "Beta Code" system with cryptographic verification.

### 4.1 Architecture

1.  **Dedicated Auth API**: `POST /v1/license/activate`
    *   **Input**: Key, DeviceID.
    *   **Output**: Signed License File (JWT/Blob).
2.  **Offline Verification**:
    *   Main Process holds a **Public Key**.
    *   On startup, verify the License File signature locally.
    *   Check `exp` (Expiry) and `sub` (DeviceID) claims in the JWT.
3.  **Benefits**:
    *   **No Network Dependency**: Once activated, works offline forever (until expiry).
    *   **Tamper Proof**: Users cannot forge a valid JWT without the Private Key.
    *   **Revocation**: Optional online check to "Block" a specific JWT ID.

### 4.2 Migration Path

1.  Implement Server-side Signing (RSA/Ed25519).
2.  Update Main Process to support `verifyLicense(jwt)`.
3.  Deprecate `validBetaCodes` logic.