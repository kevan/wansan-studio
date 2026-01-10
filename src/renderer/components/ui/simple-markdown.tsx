import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/utils/cn'

interface SimpleMarkdownProps {
  content: string
  className?: string
}

export function SimpleMarkdown({ content, className }: SimpleMarkdownProps) {
  return (
    <div className={cn('prose prose-sm prose-zinc max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Override link handling to open in new tab
          a: ({ node: _node, ...props }) => (
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline"
              {...props}
            />
          ),
          // Custom styling for headers
          h1: ({ node: _node, ...props }) => (
            <h1 className="text-xl font-bold mb-3 mt-4" {...props} />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2 className="text-lg font-semibold mb-2 mt-4" {...props} />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3 className="text-base font-semibold mb-2 mt-3" {...props} />
          ),
          // Clean paragraph spacing
          p: ({ node: _node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
          // List styling
          ul: ({ node: _node, ...props }) => (
            <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...props} />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...props} />
          ),
          li: ({ node: _node, ...props }) => (
            <li className="text-zinc-600" {...props} />
          ),
          // Bold text styling
          strong: ({ node: _node, ...props }) => (
            <strong className="font-semibold text-zinc-900" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}