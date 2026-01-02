import { isDev } from './env'

export function setupFetchLogger() {
  if (!isDev()) return

  const originalFetch = global.fetch

  global.fetch = async (...args: any[]) => {
    const [resource, config] = args
    const url = typeof resource === 'string' ? resource : resource.url
    const method = (config?.method || 'GET').toUpperCase()

    console.log(`
🌐 [Main Fetch] ${method} ${url}`)
    if (config?.headers) {
      console.log('   Headers:', JSON.stringify(config.headers))
    }

    const startTime = Date.now()

    try {
      const response = await originalFetch.apply(global, args)
      const duration = Date.now() - startTime

      console.log(`   ✅ Status: ${response.status} (${duration}ms)`)

      // Optionally log body if small
      const clone = response.clone()
      try {
        const text = await clone.text()
        try {
          const json = JSON.parse(text)
          console.log('   📦 Body:', JSON.stringify(json, null, 2))
        } catch {
          if (text.length > 0) {
            console.log(
              '   📦 Body (Text):',
              text.slice(0, 200) + (text.length > 200 ? '...' : '')
            )
          }
        }
      } catch (e) {
        /* ignore body errors */
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`   ❌ Fetch Error (${duration}ms):`, error)
      throw error
    }
  }

  console.log('[Main] Fetch logger enabled')
}
