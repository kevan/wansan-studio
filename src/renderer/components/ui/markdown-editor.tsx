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
  minHeight?: string
  hideToolbar?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  className,
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
          <div className="flex items-center gap-0.5 px-3 py-1.5 w-full bg-white/20 border-b border-zinc-50/50">
            <BoldItalicUnderlineToggles />
            <div className="w-px h-3 bg-zinc-200/60 mx-1.5" />
            <div className="wansan-lists-group flex gap-0.5">
              <ListsToggle />
            </div>
            <div className="w-px h-3 bg-zinc-200/60 mx-1.5" />
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
        contentEditableClassName="wansan-editor-content max-w-none focus:outline-none px-4 py-3 selection:bg-indigo-100 text-sm text-zinc-700"
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
            margin-bottom: 0.75rem;
            line-height: 1.75;
            font-size: 0.9rem;
        }

        /* Headings */
        .wansan-editor-content h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; }
        .wansan-editor-content h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
        .wansan-editor-content h3 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.5rem; }

        /* Lists - Standard */
        .wansan-editor-content ul {
            list-style-type: disc !important;
            padding-left: 1.2rem !important;
            margin-bottom: 0.75rem;
        }
        .wansan-editor-content ol {
            list-style-type: decimal !important;
            padding-left: 1.2rem !important;
            margin-bottom: 0.75rem;
        }
        .wansan-editor-content li {
            margin-bottom: 0.35rem;
            padding-left: 0.25rem;
            line-height: 1.6;
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
            padding: 4px 12px;
            min-height: 36px;
            overflow: visible;
            display: flex;
            gap: 2px;
            background-color: #ffffff;
            border-bottom: 1px solid #f4f4f5; /* zinc-100 */
        }
        
        .markdown-editor-wrapper [role="toolbar"] button {
            width: 26px;
            height: 26px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
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
            background-color: transparent;
        }

        .markdown-editor-wrapper [role="toolbar"] button[data-state="on"] svg {
            stroke-width: 2.2px;
            transform: scale(1.15); /* Slightly larger when active */
            color: currentColor;
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bouncy feel */
        }

        .markdown-editor-wrapper [role="toolbar"] button[data-state="on"]:hover {
            background-color: #f4f4f5;
            color: #4338ca !important;
        }

        /* Toolbar Divider */
        .markdown-editor-wrapper [role="toolbar"] .w-px {
            height: 12px;
            background-color: #e4e4e7; /* zinc-200 */
            margin: 0 6px;
            align-self: center;
        }

        .markdown-editor-wrapper [role="toolbar"] svg {
            width: 14px;
            height: 14px;
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