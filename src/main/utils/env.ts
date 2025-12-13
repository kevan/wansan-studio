import { app } from 'electron'

export const isDev = () => !app.isPackaged
export const isProd = () => app.isPackaged

// export const getAppPath = () => {
//   return isDev() ? process.cwd() : process.resourcesPath
// }

export const getUserDataPath = () => {
  const { app } = require('electron')
  return app.getPath('userData')
}
