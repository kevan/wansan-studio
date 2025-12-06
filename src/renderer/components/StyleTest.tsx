import React from 'react'

export function StyleTest() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Tailwind CSS 样式测试
      </h3>
      
      {/* 基础颜色测试 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">基础颜色:</p>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-red-500 rounded"></div>
          <div className="w-8 h-8 bg-blue-500 rounded"></div>
          <div className="w-8 h-8 bg-green-500 rounded"></div>
          <div className="w-8 h-8 bg-yellow-500 rounded"></div>
        </div>
      </div>

      {/* Primary 主题颜色测试 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Primary 主题:</p>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-primary-100 rounded border border-gray-200"></div>
          <div className="w-8 h-8 bg-primary-300 rounded"></div>
          <div className="w-8 h-8 bg-primary-500 rounded"></div>
          <div className="w-8 h-8 bg-primary-700 rounded"></div>
        </div>
      </div>

      {/* 文本颜色测试 */}
      <div className="mb-4">
        <p className="text-primary-500 font-medium">Primary 文本颜色</p>
        <p className="text-primary-700 font-semibold">Primary 深色文本</p>
      </div>

      {/* 按钮测试 */}
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors">
          Primary 按钮
        </button>
        <button className="px-4 py-2 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">
          Secondary 按钮
        </button>
      </div>
    </div>
  )
}
