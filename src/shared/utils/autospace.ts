/**
 * Autospace utility for Chinese-English mixed text typography.
 * Shared between main and renderer processes.
 */

/**
 * Insert a space between CJK characters and Latin/numbers.
 * Uses Unicode-aware regex for comprehensive CJK coverage.
 *
 * @example
 * autospace("你好World") // "你好 World"
 * autospace("Hello世界") // "Hello 世界"
 * autospace("2024年度报告") // "2024 年度报告"
 */
export function autospace(text: string): string {
  if (!text) return text

  return text
    // CJK followed by Latin letter or digit
    .replace(/([\u4e00-\u9fa5\u3400-\u4dbf])([A-Za-z0-9])/g, '$1 $2')
    // Latin letter or digit followed by CJK
    .replace(/([A-Za-z0-9])([\u4e00-\u9fa5\u3400-\u4dbf])/g, '$1 $2')
}

/**
 * Apply autospace to InsightResult-like objects.
 * Processes markdown, summary, and recommendation fields.
 */
export function autospaceInsight<T>(obj: T): T {
  if (typeof obj === 'string') {
    return autospace(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(autospaceInsight) as T
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'markdown' || key === 'summary' || key === 'recommendation') {
        result[key] = typeof value === 'string' ? autospace(value) : value
      } else if (key === 'findings' && Array.isArray(value)) {
        result[key] = value.map(autospaceInsight)
      } else {
        result[key] = value
      }
    }
    return result as T
  }

  return obj
}
