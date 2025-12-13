/**
 * Unified serialization utilities for handling JSON.stringify/parse with special types
 */

/**
 * Custom JSON replacer function that handles BigInt serialization
 */
export function jsonReplacer(key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString() + 'n'
  }
  return value
}

/**
 * Custom JSON reviver function that handles BigInt deserialization
 */
export function jsonReviver(key: string, value: any): any {
  if (typeof value === 'string' && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1))
  }
  return value
}

/**
 * Stringify an object with BigInt support
 */
export function stringify(data: any, space?: string | number): string {
  return JSON.stringify(data, jsonReplacer, space)
}

/**
 * Parse a JSON string with BigInt support
 */
export function parse<T = any>(json: string): T {
  return JSON.parse(json, jsonReviver)
}

/**
 * Create a custom storage object for zustand persist middleware
 * that handles BigInt serialization
 */
export function createBigIntStorage(storage: Storage = localStorage) {
  return {
    getItem: (name: string) => {
      const str = storage.getItem(name)
      if (!str) return null
      try {
        return parse(str)
      } catch (e) {
        console.error('Failed to parse storage item:', e)
        return null
      }
    },
    setItem: (name: string, value: any) => {
      try {
        const str = stringify(value)
        storage.setItem(name, str)
      } catch (e) {
        console.error('Failed to stringify storage item:', e)
      }
    },
    removeItem: (name: string) => storage.removeItem(name),
  }
}

/**
 * Safely stringify for display/logging purposes
 * Handles circular references and BigInt
 */
export function safeStringify(data: any, space?: string | number): string {
  const seen = new WeakSet()

  return JSON.stringify(
    data,
    (key, value) => {
      // Handle BigInt
      if (typeof value === 'bigint') {
        return value.toString() + 'n'
      }

      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'
        }
        seen.add(value)
      }

      return value
    },
    space
  )
}
