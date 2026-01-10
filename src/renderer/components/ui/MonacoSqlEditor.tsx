import React, { useEffect, useRef } from 'react'
import Editor, { Monaco } from '@monaco-editor/react'
import { registerSqlCompletion } from '@/utils/sql-completion'
import { useProjectStore } from '@/stores/useProjectStore'
import { Loader2 } from 'lucide-react'

interface MonacoSqlEditorProps {
  value: string
  onChange: (value: string) => void
  onMount?: (editor: any, monaco: Monaco) => void
  height?: string | number
  className?: string
  readOnly?: boolean
  language?: string
}

export function MonacoSqlEditor({
  value,
  onChange,
  onMount,
  height = '100%',
  className,
  readOnly = false,
  language = 'sql',
}: MonacoSqlEditorProps) {
  const files = useProjectStore(s => s.files)
  const monacoRef = useRef<Monaco | null>(null)
  const completionProviderRef = useRef<any>(null)

  // Register completion items when files change or monaco mounts
  useEffect(() => {
    if (monacoRef.current && files) {
      // Clear previous provider to avoid duplicates
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose()
      }
      completionProviderRef.current = registerSqlCompletion(monacoRef.current, files)
    }

    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose()
      }
    }
  }, [files])

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco
    
    // Register initial completion
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose()
    }
    completionProviderRef.current = registerSqlCompletion(monaco, files)

    // Set theme
    const isDark = document.documentElement.classList.contains('dark')
    monaco.editor.setTheme(isDark ? 'vs-dark' : 'light')

    if (onMount) {
      onMount(editor, monaco)
    }
  }

  return (
    <div className={className} style={{ height }}>
      <Editor
        language={language}
        value={value}
        onChange={val => onChange(val || '')}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex items-center justify-center h-full gap-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium uppercase tracking-wider">Loading Editor...</span>
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: '"Fira Code", "Fira Mono", monospace',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          padding: { top: 12, bottom: 12 },
          fixedOverflowWidgets: true, // Crucial for completion list in small containers
        }}
      />
    </div>
  )
}
