import { app } from 'electron'
import Store from 'electron-store'
import { secureGet, secureSet } from './secure-storage'
import { getDeviceId } from './device'
import type { RemoteConfig, AppConfig } from '@shared/types'

export interface AuthState {
  isActivated?: boolean
  isSpecialChannel: boolean
  isExpired: boolean
  channel: string
  expiryDate: string | null
  betaCodes: string[] // In-memory only
}

const STORE_KEY_ACTIVATED = 'isActivated'
const DEFAULT_EXPIRY = '2026-12-31'

class AuthService {
  private store: Store
  private channelEnv: string
  private currentBetaCodes: string[] = []

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
  async getAuthState(remoteData?: RemoteConfig): Promise<AuthState> {
    const licenseKey = (await secureGet('licenseKey')) || ''
    const localActivated = this.store.get(STORE_KEY_ACTIVATED, false) as boolean

    // 1. Update in-memory beta codes from remoteData.beta_code
    if (remoteData?.beta_code) {
      const rawCode = remoteData.beta_code
      this.currentBetaCodes = Array.isArray(rawCode) ? rawCode : [rawCode]
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

      if (remoteData?.isActivated) {
        isActivated = true
        this.store.set(STORE_KEY_ACTIVATED, true)
      } else if (
        licenseKey &&
        this.currentBetaCodes.includes(licenseKey.trim().toUpperCase())
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
      betaCodes: this.currentBetaCodes,
    }
  }

  async validateKeyLocally(key: string): Promise<boolean> {
    const normalized = key.trim().toUpperCase()

    if (this.currentBetaCodes.includes(normalized)) {
      this.store.set(STORE_KEY_ACTIVATED, true)
      return true
    }
    return false
  }

  async fetchRemoteConfig(): Promise<RemoteConfig | null> {
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
