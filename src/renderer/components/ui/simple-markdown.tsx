import React, { useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import { cn } from '@/utils/cn'

interface SimpleMarkdownProps {
  content: string
  className?: string
}

/**
 * Robust Markdown renderer using markdown-it.
 */
export function SimpleMarkdown({ content, className }: SimpleMarkdownProps) {
  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: false, // Disable HTML tags for security
      breaks: true, // Convert \n to <br>
      linkify: true, // Autoconvert URL-like text to links
      typographer: true,
    })
    
    // Custom renderer for links to open in new tab
    const defaultRender = instance.renderer.rules.link_open || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    instance.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      // Add target="_blank"
      const aIndex = tokens[idx].attrIndex('target');
      if (aIndex < 0) {
        tokens[idx].attrPush(['target', '_blank']);
      } else {
        // @ts-ignore
        tokens[idx].attrs[aIndex][1] = '_blank';
      }
      
      // Add rel="noopener noreferrer"
      const relIndex = tokens[idx].attrIndex('rel');
      if (relIndex < 0) {
        tokens[idx].attrPush(['rel', 'noopener noreferrer']);
      } else {
        // @ts-ignore
        tokens[idx].attrs[relIndex][1] = 'noopener noreferrer';
      }

      return defaultRender(tokens, idx, options, env, self);
    };

    return instance
  }, [])

  if (!content) return null

  const htmlContent = md.render(content)

  return (
    <div 
      className={cn(
        'prose prose-sm prose-zinc max-w-none text-sm',
        // Explicitly enforce list styles
        '[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:ml-1',
        '[&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:ml-1',
        '[&_li]:marker:text-zinc-400 [&_li]:pl-1',
        // Link styles
        'prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline',
        className
      )}
      dangerouslySetInnerHTML={{ __html: htmlContent }} 
    />
  )
}