import React from 'react'
import { Header } from './components/Header'
import { MainContent } from './components/MainContent'
import { Footer } from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 应用头部 */}
      <Header />
      
      {/* 主要内容区域 */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <MainContent />
      </main>
      
      {/* 应用底部 */}
      <Footer />
    </div>
  )
}

export default App
