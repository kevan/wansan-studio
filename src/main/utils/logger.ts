export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  args?: any[]
}

const MAX_LOGS = 200
const logs: LogEntry[] = []

function formatArgs(args: any[]) {
  return args.map(arg => {
      if (arg instanceof Error) return { message: arg.message, stack: arg.stack }
      return arg
  })
}

export function captureLog(level: 'info' | 'warn' | 'error', message: any, ...args: any[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: String(message),
    args: args.length > 0 ? formatArgs(args) : undefined
  }
  
  logs.unshift(entry)
  if (logs.length > MAX_LOGS) logs.pop()
}

export function getMainLogs() {
  return logs
}

// Intercept console
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

export function setupLogger() {
    console.log = (message?: any, ...optionalParams: any[]) => {
        originalConsoleLog(message, ...optionalParams)
        captureLog('info', message, ...optionalParams)
    }

    console.warn = (message?: any, ...optionalParams: any[]) => {
        originalConsoleWarn(message, ...optionalParams)
        captureLog('warn', message, ...optionalParams)
    }

    console.error = (message?: any, ...optionalParams: any[]) => {
        originalConsoleError(message, ...optionalParams)
        captureLog('error', message, ...optionalParams)
    }

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error)
    })

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason)
    })
}
