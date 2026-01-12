import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './utils/queryClient'
import App from './App'
import './styles/globals.css'
import './i18n'
import { enableFetchLogger } from './utils/fetch-logger'
import { useLogStore } from './stores/useLogStore'

// Enable fetch logging in development
if (import.meta.env.DEV) {
  enableFetchLogger()
}

// 确保 DOM 元素存在
const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

// 创建 React 根节点
const root = createRoot(container)

// 渲染应用
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* DevTools 默认隐藏，需要时点击右下角按钮打开 */}
      {/* <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" /> */}
    </QueryClientProvider>
  </React.StrictMode>
)
