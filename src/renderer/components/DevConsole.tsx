import { useCallback, useEffect, useRef, useState } from 'react'
import { isDev } from '../utils/env'
import i18n from '../i18n'

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
  const [language, setLanguage] = useState(i18n.language || 'en')
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
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
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
  const resetApp = useCallback(() => {
    if (typeof (window as any).resetApp === 'function') {
      ;(window as any).resetApp()
    } else {
      console.warn('resetApp is not available in this environment')
    }
  }, [])

  const printAllTables = useCallback(async () => {
    try {
      const result = await window.electronAPI.invoke('get-schema')
      console.log('📊 Fetching all tables from DuckDB...', result)

      if (result.success && result.data && Array.isArray(result.data.tables)) {
        const tables = result.data.tables
        console.log(`✅ Found ${tables.length} table(s):`, tables)

        // 详细打印每个表的结构
        tables.forEach((table: any, idx: number) => {
          console.log(`\n${idx + 1}. Table: ${table.tableName || 'unnamed'}`)
          console.log(`   Description: ${table.description || 'N/A'}`)
          console.log(`   Columns: ${table.columns?.length || 0}`)

          if (table.columns && Array.isArray(table.columns)) {
            table.columns.forEach((col: any) => {
              console.log(`     - ${col.name} (${col.type || 'unknown'})`)
            })
          }
        })
      } else {
        console.warn('No tables found or invalid response:', result)
      }
    } catch (error) {
      console.error('❌ Failed to fetch tables:', error)
    }
  }, [])

  useEffect(() => {
    const handleLanguageChange = (lng: string) => setLanguage(lng)
    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [])

  const handleLanguageSwitch = async (lng: string) => {
    if (lng === language) return
    await i18n.changeLanguage(lng)
  }

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
            <div className="flex flex-wrap gap-2 mb-3">
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
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={printAllTables}
                className="px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm"
              >
                🗄️ Print All Tables
              </button>
              <button
                onClick={resetApp}
                className="px-3 py-2 bg-red-700 hover:bg-red-600 rounded text-sm"
              >
                ♻️ Reset App State
              </button>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm">
                <span className="text-gray-400">Language</span>
                <select
                  value={language}
                  onChange={e => handleLanguageSwitch(e.target.value)}
                  className="bg-gray-700 text-white text-sm px-2 py-1 rounded focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
