import { app } from 'electron'
import Store from 'electron-store'
import { secureGet, secureSet } from './secure-storage'
import { getDeviceId } from './device'

export interface AuthState {
  isActivated?: boolean
  isSpecialChannel: boolean
  isExpired: boolean
  channel: string
  expiryDate: string | null
  validBetaCodes: string[] // Cached from remote
}

const STORE_KEY_ACTIVATED = 'isActivated'
const STORE_KEY_BETA_CODES = 'cachedBetaCodes'
const DEFAULT_EXPIRY = '2026-12-31'

class AuthService {
  private store: Store
  private channelEnv: string

  constructor() {
    this.store = new Store()
    // Read build-time injected env or runtime env
    this.channelEnv =
      process.env.SPECIAL_CHANNEL || process.env.VITE_SPECIAL_CHANNEL || ''
  }

  /**
   * Main entry point to get the current authentication status.
   * Merges Local state, Environment variables, and Remote config.
   */
  async getAuthState(remoteData?: any): Promise<AuthState> {
    const licenseKey = (await secureGet('licenseKey')) || ''
    const localActivated = this.store.get(STORE_KEY_ACTIVATED, false) as boolean
    const cachedBetaCodes =
      (this.store.get(STORE_KEY_BETA_CODES, []) as string[]) || []

    // 1. Update cached beta codes if remote provided them
    let currentBetaCodes = cachedBetaCodes
    if (remoteData && Array.isArray(remoteData.valid_beta_codes)) {
      currentBetaCodes = remoteData.valid_beta_codes
      this.store.set(STORE_KEY_BETA_CODES, currentBetaCodes)
    }

    // 2. Determine Channel & Special Status
    // Remote channel takes precedence over local env (if we want to rename it remotely)
    const channel = remoteData?.channel || this.channelEnv
    const isSpecial = !!channel

    // 3. Determine Expiry
    let expiryDate: string | null = null
    if (isSpecial) {
      expiryDate =
        remoteData?.specialExpiry ||
        remoteData?.special_expiry ||
        DEFAULT_EXPIRY
    }

    // 4. Determine Activated Status
    let isActivated: boolean | undefined = undefined // Default to undefined for standard users (let renderer decide)
    let isExpired = false

    if (isSpecial) {
      // Special Channel Logic
      if (expiryDate) {
        isExpired = new Date() > new Date(expiryDate)
      }
      // Special channels are activated by default unless expired
      isActivated = !isExpired
    } else {
      // Standard User Logic (Local-First Beta Code System)
      // Only set isActivated if we have a POSITIVE reason (Remote valid OR Local Key match)
      // Otherwise leave it undefined so Renderer's localStorage persists.

      if (remoteData?.auth?.is_valid) {
        isActivated = true
        this.store.set(STORE_KEY_ACTIVATED, true)
      } else if (remoteData?.auth?.is_valid === false) {
        // Explicit revocation
        isActivated = false
        this.store.set(STORE_KEY_ACTIVATED, false)
      } else if (
        licenseKey &&
        currentBetaCodes.includes(licenseKey.trim().toUpperCase())
      ) {
        isActivated = true
        this.store.set(STORE_KEY_ACTIVATED, true)
      }
      // If we used to be activated locally in Main, keep it.
      else if (localActivated) {
        isActivated = true
      }
    }

    return {
      isActivated: isActivated,
      isSpecialChannel: isSpecial,
      isExpired,
      channel,
      expiryDate,
      validBetaCodes: currentBetaCodes,
    }
  }

  async validateKeyLocally(key: string): Promise<boolean> {
    const normalized = key.trim().toUpperCase()
    const codes = (this.store.get(STORE_KEY_BETA_CODES, []) as string[]) || []

    if (codes.includes(normalized)) {
      this.store.set(STORE_KEY_ACTIVATED, true)
      return true
    }
    return false
  }

  async fetchRemoteConfig(): Promise<any> {
    const appVersion = app.getVersion()
    const deviceId = await getDeviceId()
    const licenseKey = (await secureGet('licenseKey')) || ''

    const url = new URL('https://api.wansan.app/v1/config')
    url.searchParams.append('channel', this.channelEnv)
    url.searchParams.append('version', appVersion)

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'X-App-Version': appVersion,
          'X-Special-Channel': this.channelEnv,
          'X-License-Key': licenseKey, // 仅在 Header 中传输
          'X-Device-Id': deviceId,
        },
        // Short timeout to prevent blocking startup too long
        signal: AbortSignal.timeout(5000),
      })

      if (res.ok) {
        return await res.json()
      }
    } catch (e) {
      console.warn('[AuthService] Remote fetch failed:', e)
    }
    return null // Return null to indicate failure/offline
  }
}

export const authService = new AuthService()
