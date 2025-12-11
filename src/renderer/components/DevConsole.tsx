import { useState, useEffect, useCallback, useRef } from 'react'
import { isDev } from '../utils/env'

interface LogEntry {
  id: number
  type: 'log' | 'warn' | 'error' | 'info'
  message: string
  timestamp: Date
}

interface DevConsoleProps {
  defaultOpen?: boolean
}

// 生产环境不渲染
export function DevConsole({
  defaultOpen = false,
}: DevConsoleProps) {
  if (!isDev) return null

  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isMinimized, setIsMinimized] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState<'console' | 'tools'>('console')
  const logIdRef = useRef(0)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 拦截 console 方法
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    }

    const createLogger =
      (type: LogEntry['type']) =>
      (...args: unknown[]) => {
        originalConsole[type](...args)
        const message = args
          .map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(' ')

        setLogs(prev => [
          ...prev.slice(-99),
          {
            id: ++logIdRef.current,
            type,
            message,
            timestamp: new Date(),
          },
        ])
      }

    console.log = createLogger('log')
    console.warn = createLogger('warn')
    console.error = createLogger('error')
    console.info = createLogger('info')

    return () => {
      console.log = originalConsole.log
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.info = originalConsole.info
    }
  }, [])

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const clearLogs = useCallback(() => setLogs([]), [])

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warn':
        return 'text-yellow-600 bg-yellow-50'
      case 'info':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-700'
    }
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 text-sm font-mono"
      >
        🛠️ Dev Console
      </button>
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 text-sm font-mono"
      >
        🛠️ Dev Console
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-2xl border-t border-gray-700">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-semibold">
            🛠️ Dev Console
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1 text-xs rounded ${activeTab === 'console' ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
            >
              Console
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3 py-1 text-xs rounded ${activeTab === 'tools' ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
            >
              Tools
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="px-2 py-1 text-xs hover:bg-gray-700 rounded"
          >
            🗑️ Clear
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="px-2 py-1 text-xs hover:bg-gray-700 rounded"
          >
            ➖
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 text-xs hover:bg-gray-700 rounded"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="h-48 overflow-hidden">
        {activeTab === 'console' ? (
          <div className="h-full overflow-y-auto p-2 font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                No logs yet...
              </div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`px-2 py-1 rounded ${getLogColor(log.type)}`}
                >
                  <span className="text-gray-400 mr-2">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>
                  <span className="uppercase mr-2 font-semibold">
                    {log.type}
                  </span>
                  <span className="whitespace-pre-wrap break-all">
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        ) : (
          <div className="h-full p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => console.log('Test log')}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
              >
                📝 Test Log
              </button>
              <button
                onClick={() => console.warn('Test warning')}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-sm"
              >
                ⚠️ Test Warn
              </button>
              <button
                onClick={() => console.error('Test error')}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm"
              >
                ❌ Test Error
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
