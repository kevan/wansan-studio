import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './utils/queryClient'
import App from './App'
import './styles/globals.css'

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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)
