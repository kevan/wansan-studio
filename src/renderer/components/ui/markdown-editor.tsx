import React, { useRef } from 'react'
import {
  MDXEditor,
  MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  BoldItalicUnderlineToggles,
  toolbarPlugin,
  ListsToggle,
  UndoRedo,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { cn } from '@/utils/cn'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  contentClassName?: string // [NEW]
  minHeight?: string
  hideToolbar?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  className,
  contentClassName, // [NEW]
  minHeight = '120px',
  hideToolbar = false,
  placeholder,
}: MarkdownEditorProps) {
  const ref = useRef<MDXEditorMethods>(null)

  const plugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
  ]

  if (!hideToolbar) {
    plugins.push(
      toolbarPlugin({
        toolbarContents: () => (
          <div className="flex items-center gap-0.5 px-2 py-1 w-full bg-zinc-50/50 border-b border-zinc-100/50">
            <BoldItalicUnderlineToggles />
            <div className="w-px h-3 bg-zinc-200/60 mx-1" />
            <div className="wansan-lists-group flex gap-0.5">
              <ListsToggle />
            </div>
            <div className="w-px h-3 bg-zinc-200/60 mx-1" />
            <UndoRedo />
          </div>
        ),
      })
    )
  }

  return (
    <div
      className={cn(
        'markdown-editor-wrapper border border-zinc-100 rounded-2xl overflow-hidden bg-white/40 backdrop-blur-sm focus-within:border-indigo-200 focus-within:ring-4 focus-within:ring-indigo-50/30 transition-all duration-300',
        className
      )}
    >
      <MDXEditor
        ref={ref}
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        // Remove 'prose' to avoid conflicts. Use custom class for full control.
        contentEditableClassName={cn(
          "wansan-editor-content max-w-none focus:outline-none px-4 py-3 selection:bg-indigo-100 text-sm text-zinc-700",
          contentClassName
        )}
        plugins={plugins}
      />
      <style>{`
        /* Reset MDXEditor default heavy styles */
        .markdown-editor-wrapper .mdxeditor {
            background: transparent;
        }

        /* Hide Checklist buttons - Exact match based on HTML inspect */
        button[aria-label="Check list"],
        button[title="Check list"],
        [role="menuitem"][aria-label="Check list"] {
            display: none !important;
        }

        /* --- Custom Editor Typography (No Prose) --- */
        
        /* Basic Text */
        .wansan-editor-content p {
            margin-bottom: 0.5rem;
            line-height: 1.6;
            font-size: 0.9rem;
        }

        /* Headings */
        .wansan-editor-content h1 { font-size: 1.4rem; font-weight: 700; margin-top: 0.75rem; margin-bottom: 0.4rem; }
        .wansan-editor-content h2 { font-size: 1.2rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.4rem; }
        .wansan-editor-content h3 { font-size: 1.1rem; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.4rem; }

        /* Lists - Standard */
        .wansan-editor-content ul {
            list-style-type: disc !important;
            padding-left: 1.2rem !important;
            margin-bottom: 0.5rem;
        }
        .wansan-editor-content ol {
            list-style-type: decimal !important;
            padding-left: 1.2rem !important;
            margin-bottom: 0.5rem;
        }
        .wansan-editor-content li {
            margin-bottom: 0.25rem;
            padding-left: 0.2rem;
            line-height: 1.5;
        }
        /* Ensure list markers are visible */
        .wansan-editor-content li::marker {
            color: #a1a1aa; /* zinc-400 */
        }

        /* Bold/Italic */
        .wansan-editor-content strong { font-weight: 600; color: #18181b; }
        .wansan-editor-content em { font-style: italic; }

        /* Blockquote */
        .wansan-editor-content blockquote {
            border-left: 3px solid #e4e4e7;
            padding-left: 1rem;
            font-style: italic;
            color: #71717a;
        }

        /* --- Toolbar Styles --- */
        
        .markdown-editor-wrapper [role="toolbar"] {
            padding: 2px 8px;
            min-height: 32px;
            overflow: visible;
            display: flex;
            align-items: center;
            gap: 1px;
            background-color: transparent;
            border-bottom: 1px solid #f4f4f5; /* zinc-100 */
        }
        
        .markdown-editor-wrapper [role="toolbar"] button {
            width: 24px;
            height: 24px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 5px;
            color: #a1a1aa; /* zinc-400 */
            border: 1px solid transparent; 
            margin: 0;
            transition: all 0.15s ease;
            background-color: transparent;
        }
        
        .markdown-editor-wrapper [role="toolbar"] button:hover {
            background-color: #f4f4f5; /* zinc-100 */
            color: #18181b; /* zinc-900 */
        }
        
        .markdown-editor-wrapper [role="toolbar"] button[data-state="on"] {
            color: #4f46e5 !important; /* indigo-600 */
            background-color: #eff6ff; /* indigo-50 */
        }

        .markdown-editor-wrapper [role="toolbar"] button[data-state="on"] svg {
            stroke-width: 2.2px;
            color: currentColor;
        }

        /* Toolbar Divider */
        .markdown-editor-wrapper [role="toolbar"] .w-px {
            height: 10px;
            background-color: #e4e4e7; /* zinc-200 */
            margin: 0 4px;
            align-self: center;
        }

        .markdown-editor-wrapper [role="toolbar"] svg {
            width: 13px;
            height: 13px;
        }

        /* Hide Checklist buttons - Try standard MDXEditor labels */
        button[title="Toggle task list"],
        button[aria-label="Toggle task list"],
        [role="menuitem"][title="Toggle task list"],
        [role="menuitem"][aria-label="Toggle task list"] {
            display: none !important;
        }

        .markdown-editor-wrapper .mdxeditor-root:focus-within {
            outline: none;
        }
        
        .markdown-editor-wrapper [contenteditable]:focus {
            outline: none;
        }

        /* Adjust min-height of the editable area */
        .markdown-editor-wrapper [contenteditable] {
            min-height: ${minHeight};
        }
      `}</style>
    </div>
  )
}