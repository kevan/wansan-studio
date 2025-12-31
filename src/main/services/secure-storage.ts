import { safeStorage } from 'electron'
import Store from 'electron-store'

// We use a separate store for secure items to avoid conflict/bloat in main store
const store = new Store({
  name: 'wansan-secure-storage',
})

export function secureSet(key: string, value: string): boolean {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value)
      store.set(key, encrypted.toString('base64')) // Using base64 for storage
      return true
    } else {
      console.warn('safeStorage is not available. Key was not saved:', key)
      return false
    }
  } catch (error) {
    console.error('secureSet error:', error)
    return false
  }
}

export function secureGet(key: string): string | null {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const stored = store.get(key) as string
      if (!stored) return null

      const buffer = Buffer.from(stored, 'base64')
      const decrypted = safeStorage.decryptString(buffer)
      return decrypted
    }
    return null
  } catch (error) {
    console.error('secureGet error:', error)
    return null
  }
}

export function secureClear() {
  store.clear()
}
