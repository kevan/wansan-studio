import React, { useEffect, useRef } from 'react'
import Editor, { Monaco } from '@monaco-editor/react'
import { registerSqlCompletion } from '@/utils/sql-completion'
import { useProjectStore } from '@/stores/useProjectStore'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onMount?: (editor: any, monaco: Monaco) => void
  height?: string | number
  className?: string
  readOnly?: boolean
  language?: string
  minimap?: boolean
  stickyScroll?: boolean
}

export function CodeEditor({
  value,
  onChange,
  onMount,
  height = '100%',
  className,
  readOnly = false,
  language = 'sql',
  minimap = true,
  stickyScroll = true,
}: CodeEditorProps) {
  const { t } = useTranslation('common')
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

    // Define custom themes
    monaco.editor.defineTheme('wansan-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.lineHighlightBackground': '#f5f3ff', // Very light purple
        'editor.lineHighlightBorder': '#00000000', // Transparent border
      },
    })

    monaco.editor.defineTheme('wansan-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.lineHighlightBackground': '#2e106533', // Deep purple with low opacity
        'editor.lineHighlightBorder': '#00000000',
      },
    })

    // Set theme
    const isDark = document.documentElement.classList.contains('dark')
    monaco.editor.setTheme(isDark ? 'wansan-dark' : 'wansan-light')

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
            <span className="text-xs font-medium uppercase tracking-wider">
              {t('loading_editor')}
            </span>
          </div>
        }
        options={{
          minimap: {
            enabled: minimap,
            renderCharacters: false,
            scale: 1,
            side: 'right',
          },
          fontSize: 13,
          fontFamily: '"Fira Code", "Fira Mono", monospace',
          scrollBeyondLastLine: true,
          automaticLayout: true,
          readOnly,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          padding: { top: 12, bottom: 12 },
          fixedOverflowWidgets: true,
          folding: true,
          showFoldingControls: 'mouseover',
          stickyScroll: {
            enabled: stickyScroll,
            maxLineCount: 3,
            defaultModel: 'indentationModel',
          },
        }}
      />
    </div>
  )
}
