import React from 'react'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>© 2024 Wansan Studio</span>
            <span>•</span>
            <span>本地优先的智能商业报表工具</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>版本 0.1.0</span>
            <span>•</span>
            <span>数据聚宝，日进斗金</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
