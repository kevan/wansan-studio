/**
 * 环境检测工具
 * 用于判断当前运行环境（开发/生产）
 */

// Vite 在构建时通过 define 配置注入的全局变量
declare const __IS_DEV__: boolean

/**
 * 是否为开发模式
 * 使用 Vite 注入的 __IS_DEV__ 全局变量（在 vite.config.ts 中定义）
 */
export const isDev: boolean = __IS_DEV__

/**
 * 是否为生产模式
 */
export const isProd = !isDev

/**
 * 当前环境模式
 */
export const mode = isDev ? 'development' : 'production'

