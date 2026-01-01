import { app } from 'electron'
import Store from 'electron-store'
import { getDeviceId } from './device'
import type { RemoteConfig } from '@shared/types'

export interface AuthState {
  isActivated?: boolean
  isSpecialChannel: boolean
  isExpired: boolean
  channel: string
  expiryDate: string | null
  betaCodes: string[] // In-memory only
}

const STORE_KEY_ACTIVATED = 'isActivated'

const STORE_KEY_EXPIRY = 'cachedSpecialExpiry' // [NEW] Persistence key

const DEFAULT_EXPIRY = '2026-12-31'

class AuthService {
  private store: Store

  private channelEnv: string

  private currentBetaCodes: string[] = []

  constructor() {
    this.store = new Store({
      name: 'wansan-auth', // 独立文件 wansan-auth.json
      encryptionKey: 'wansan-studio-secure-config-key',
    })
    // Read build-time injected env or runtime env

    this.channelEnv = process.env.VITE_SPECIAL_CHANNEL || ''
  }

  // Allow refreshing env after dotenv load
  loadEnv() {
    this.channelEnv = process.env.VITE_SPECIAL_CHANNEL || ''
    console.log('[AuthService] Loaded Channel Env:', this.channelEnv)
  }

  /**

   * Main entry point to get the current authentication status.

   * Merges Local state, Environment variables, and Remote config.

   */

  async getAuthState(remoteData?: RemoteConfig): Promise<AuthState> {
    const localActivated = this.store.get(STORE_KEY_ACTIVATED, false) as boolean

    const cachedExpiry = this.store.get(
      STORE_KEY_EXPIRY,
      DEFAULT_EXPIRY
    ) as string

    // 1. Update in-memory beta codes from remoteData.beta_code

    if (remoteData?.beta_code) {
      const rawCode = remoteData.beta_code

      this.currentBetaCodes = Array.isArray(rawCode) ? rawCode : [rawCode]
    }

    // 2. Determine Channel & Special Status

    const channel = remoteData?.channel || this.channelEnv

    const isSpecial = !!channel

    // 3. Determine Expiry (Remote > Cached > Default)

    let expiryDate: string | null = null

    if (isSpecial) {
      if (remoteData?.special_expiry) {
        expiryDate = remoteData.special_expiry

        // Persist new expiry from server

        this.store.set(STORE_KEY_EXPIRY, expiryDate)
      } else {
        // Fallback to cached expiry (Offline support)

        expiryDate = cachedExpiry
      }
    }

    // 4. Determine Activated Status
    let isActivated: boolean | undefined = undefined
    let isExpired = false

    if (isSpecial) {
      if (expiryDate) {
        isExpired = new Date() > new Date(expiryDate)
      }
      isActivated = !isExpired
    } else {
      // Standard User: Trust local storage first during beta
      if (localActivated) {
        isActivated = true
      }
    }

    const res = {
      isActivated: isActivated,
      isSpecialChannel: isSpecial,
      isExpired,
      channel,
      expiryDate,
      betaCodes: this.currentBetaCodes,
    }
    console.log('[AuthService] getAuthState', {
      channel: this.channelEnv,
      remoteData,
      res,
    })
    return res
  }

  async validateKeyLocally(key: string): Promise<boolean> {
    const normalized = key.trim().toUpperCase()
    if (this.currentBetaCodes.includes(normalized)) {
      this.activateLocally()
      return true
    }
    return false
  }

  activateLocally() {
    this.store.set(STORE_KEY_ACTIVATED, true)
  }

  async fetchRemoteConfig(): Promise<RemoteConfig | null> {
    const appVersion = app.getVersion()
    const deviceId = await getDeviceId()

    const url = new URL('https://api.wansan.app/v1/config')
    url.searchParams.append('channel', this.channelEnv)
    url.searchParams.append('version', appVersion)

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'X-App-Version': appVersion,
          'X-Special-Channel': this.channelEnv,
          'X-Device-Id': deviceId,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        return await res.json()
      }
    } catch (e) {
      console.warn('[AuthService] Remote fetch failed:', e)
    }
    return null // Return null to indicate failure/offline
  }

  reset() {
    this.store.clear()
  }
}

export const authService = new AuthService()
