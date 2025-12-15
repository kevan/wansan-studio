export function enableFetchLogger() {
  if (!import.meta.env.DEV) return

  const originalFetch = window.fetch

  window.fetch = async (...args) => {
    const [resource, config] = args
    const method = (config?.method || 'GET').toUpperCase()

    console.groupCollapsed(`🌐 Fetch [${method}]: ${resource}`)
    if (config) console.log('Config:', config)

    const startTime = performance.now()

    try {
      const response = await originalFetch(...args)
      const duration = (performance.now() - startTime).toFixed(2)

      console.log(`Status: ${response.status} (${response.statusText})`)
      console.log(`Duration: ${duration}ms`)

      // Clone response to read body without consuming it
      const clone = response.clone()
      try {
        const text = await clone.text()
        try {
          console.log('Body (JSON):', JSON.parse(text))
        } catch {
          // Limit text output length
          console.log(
            'Body (Text):',
            text.slice(0, 1000) + (text.length > 1000 ? '...' : '')
          )
        }
      } catch (e) {
        console.log('Body: (Stream or Locked/Error reading)', e)
      }

      console.groupEnd()
      return response
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2)
      console.error(`Fetch Error (${duration}ms):`, error)
      console.groupEnd()
      throw error
    }
  }

  console.log('[Dev] Fetch logger enabled')
}
