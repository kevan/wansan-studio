import { useState, useCallback, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { DevConsole } from './components/DevConsole'
import { isDev } from './utils/env'
import { ToastContainer } from './components/Toast'

function App() {
  const [showShowcase, setShowShowcase] = useState(false)
  const [showStyleTest, setShowStyleTest] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleShowcase = useCallback(() => setShowShowcase(true), [])
  const handleStyleTest = useCallback(() => setShowStyleTest(true), [])

  // 处理导入数据 - 触发文件选择或其他导入方式
  const handleImportData = useCallback(() => {
    // 这里可以扩展为打开一个导入对话框
    // 目前简单地让用户知道可以通过主区域的 Drop Zone 导入
    // 或者触发系统文件选择器
    if (window.electronAPI) {
      window.electronAPI.selectFile().then(result => {
        if (result.success && result.data) {
          // 通过 WelcomeScreen 的逻辑处理
          // 这里可以直接触发文件处理，但为了保持逻辑一致性，
          // 提示用户使用 Drop Zone
          alert('请将文件拖拽到右侧区域，或在空状态页面点击选择文件')
        }
      })
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <ToastContainer />
      {/* 左侧 Sidebar - 260px fixed */}
      <Sidebar onImportData={handleImportData} />

      {/* 主画布区域 - Flex-1 */}
      <main className="wansan-canvas">
        <MainContent
          showShowcase={showShowcase}
          showStyleTest={showStyleTest}
          onCloseShowcase={() => setShowShowcase(false)}
          onCloseStyleTest={() => setShowStyleTest(false)}
        />
      </main>

      {/* 开发模式调试控制台 */}
      {/* {isDev && (
        <DevConsole
          defaultOpen={true}
          onShowcase={handleShowcase}
          onStyleTest={handleStyleTest}
        />
      )} */}
    </div>
  )
}

export default App
