export const isDev = () => process.env.NODE_ENV === 'development'
export const isProd = () => process.env.NODE_ENV === 'production'

// export const getAppPath = () => {
//   return isDev() ? process.cwd() : process.resourcesPath
// }

export const getUserDataPath = () => {
  const { app } = require('electron')
  return app.getPath('userData')
}
