import { app } from 'electron'

export const isDev = () => !app.isPackaged
export const isProd = () => app.isPackaged

export const getAppUserAgent = () => {
  const version = app.getVersion()
  const env = isDev() ? 'Development' : 'Production'
  // Use a format that includes "wansan-studio" to match CF rules
  return `wansan-studio/${version} (${env})`
}

