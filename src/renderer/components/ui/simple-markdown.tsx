import React from 'react'
import { cn } from '@/utils/cn'

interface SimpleMarkdownProps {
  content: string
  className?: string
}

export function SimpleMarkdown({ content, className }: SimpleMarkdownProps) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  
  let listBuffer: React.ReactNode[] = []
  
  const flushList = () => {
    if (listBuffer.length > 0) {
       elements.push(<ul key={`list-${elements.length}`} className="list-disc list-outside ml-4 mb-4 space-y-1">{[...listBuffer]}</ul>)
       listBuffer = []
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    // Empty lines act as separators but we rely on margins.
    // However, consecutive empty lines shouldn't add too much space.
    if (!trimmed) {
       flushList()
       return
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
        flushList()
        elements.push(<hr key={index} className="my-6 border-zinc-200" />)
        return
    }

    // Headers
    if (line.startsWith('# ')) {
        flushList()
        elements.push(<h1 key={index} className="text-2xl font-bold mb-4 mt-2 text-zinc-900">{parseInline(line.slice(2))}</h1>)
        return
    }
    if (line.startsWith('## ')) {
        flushList()
        elements.push(<h2 key={index} className="text-lg font-semibold mb-3 mt-6 text-zinc-800">{parseInline(line.slice(3))}</h2>)
        return
    }

    // List
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        listBuffer.push(<li key={index} className="text-zinc-600 leading-relaxed">{parseInline(line.trim().slice(2))}</li>)
        return
    }

    // Paragraph
    flushList()
    elements.push(<p key={index} className="mb-2 text-zinc-600 leading-relaxed">{parseInline(trimmed)}</p>)
  })
  
  flushList()

  return <div className={cn("text-sm max-w-none prose prose-sm prose-zinc", className)}>{elements}</div>
}

function parseInline(text: string): React.ReactNode {
  // Simple bold parsing: **bold**
  // Note: This naive split might break if nested or multiple bolds are adjacent without non-bold separator.
  // But for the disclaimer text provided, it works.
  const parts = text.split(/(\**.*?\**)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-zinc-900">{part.slice(2, -2)}</strong>
    }
    return part
  })
}
