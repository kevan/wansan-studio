import pkg from 'node-machine-id'
const { machineId } = pkg
import { isDev } from '../utils/env'

export async function getDeviceId(): Promise<string> {
  try {
    const id = await machineId()
    if (isDev()) {
      console.log('[Device Service] ID:', id)
    }
    return id
  } catch (error) {
    console.error('[Device Service] Failed to get machine ID:', error)
    // Fallback or rethrow depending on requirements.
    // For now returning a UUID-like fallback or empty string could be dangerous if uniqueness is critical.
    // Let's assume we want to know if it fails.
    throw error
  }
}
