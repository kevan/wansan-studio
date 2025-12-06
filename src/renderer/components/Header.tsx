import React from 'react'

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo 和标题 */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 wansan-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">万</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Wansan Studio</h1>
              <p className="text-sm text-gray-500">数据聚宝，日进斗金</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-3">
            <button className="wansan-button-secondary">
              设置
            </button>
            <button className="wansan-button-primary">
              导入数据
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
