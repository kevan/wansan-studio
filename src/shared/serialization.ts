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

/**
 * Summarize a JSON object for token-efficient LLM context
 * - Limits recursion depth
 * - Truncates arrays to first element
 * - Limits object keys
 * - Truncates long strings
 */
export function summarizeJson(value: any, depth = 0): any {
  if (value === null || value === undefined) return value

  // Limit recursion depth to save tokens on deep nesting
  if (depth > 3) {
    if (Array.isArray(value)) return '[...]'
    if (typeof value === 'object') return '{...}'
    // For primitives, allow fall-through to handle string truncation
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return []
    // Only keep the first item to show structure
    return [summarizeJson(value[0], depth + 1)]
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    const summary: any = {}
    const MAX_KEYS = 8 // Limit number of keys shown

    keys.slice(0, MAX_KEYS).forEach(k => {
      summary[k] = summarizeJson(value[k], depth + 1)
    })

    if (keys.length > MAX_KEYS) {
      summary['...'] = `(${keys.length - MAX_KEYS} more keys)`
    }

    return summary
  }

  // Truncate long strings within JSON
  if (typeof value === 'string') {
    if (value.length > 50) {
      return value.substring(0, 50) + '...'
    }
  }

  return value
}

/**
 * Standardize Date/Time values to ISO string
 * Handles Date objects, number timestamps, and parseable strings
 */
export function formatDateValue(val: any): string | null {
  if (val === null || val === undefined) return null

  let dateObj: Date | null = null

  if (val instanceof Date) {
    dateObj = val
  } else if (typeof val === 'number') {
    dateObj = new Date(val)
  } else if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      dateObj = d
    }
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    return dateObj.toISOString()
  }

  return null
}

/**
 * Process a single value for LLM context sampling
 * Handles: BigInt, Date (ISO), JSON summarization, and string truncation
 */
export function processSampleValue(val: any, columnType?: string): any {
  // Handle BigInt
  if (typeof val === 'bigint') {
    return val.toString()
  }

  // Handle Date/Time Types if columnType is provided
  if (columnType) {
    const lowerType = columnType.toLowerCase()
    if (
      lowerType.includes('date') ||
      lowerType.includes('time') ||
      lowerType.includes('timestamp')
    ) {
      const formattedDate = formatDateValue(val)
      if (formattedDate) return formattedDate
    }
  }

  // Handle Float: keep 4 decimal places
  if (typeof val === 'number') {
    return Math.round(val * 10000) / 10000
  }

  // Handle Object/Array - treat as JSON
  if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
    try {
      const summary = summarizeJson(val)
      return JSON.stringify(summary)
    } catch (e) {
      val = String(val)
    }
  }

  // Handle String (check for JSON)
  if (typeof val === 'string') {
    const MAX_LEN = 50

    // Attempt to identify and summarize JSON
    const trimmed = val.trim()
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(val)
        // Summarize the structure to keep keys but shorten values
        const summary = summarizeJson(parsed)
        return JSON.stringify(summary)
      } catch (e) {
        // Try to handle "unescaped" JSON (e.g. {\"a\": 1} copied from logs)
        try {
          const unescaped = val.replace(/\\"/g, '"')
          const parsed = JSON.parse(unescaped)
          const summary = summarizeJson(parsed)
          return JSON.stringify(summary)
        } catch (e2) {
          // Ignore parse errors, fall through to string truncation
        }
      }
    }

    if (val.length > MAX_LEN) {
      return val.substring(0, MAX_LEN) + '...'
    }
  }

  return val
}
