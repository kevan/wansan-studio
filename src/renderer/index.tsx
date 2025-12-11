import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './utils/queryClient'
import App from './App'
import './styles/globals.css'
import './i18n'
import { useFileStore } from './stores/useFileStore'
import { useChatStore } from './stores/useChatStore'
import { useWorkbenchStore } from './stores/useWorkbenchStore'

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

if (import.meta.env.DEV) {
  ;(window as any).resetApp = () => {
    console.log('💥 NUKING APP STATE...')

    localStorage.removeItem('wansan-files')
    localStorage.removeItem('wansan-chat')
    localStorage.removeItem('wansan-workbench')

    useFileStore.getState().reset()
    useChatStore.getState().reset()
    useWorkbenchStore.getState().reset()

    window.location.reload()
  }

  console.log("🔧 DevTools: Run 'resetApp()' to clear all state.")
}
