import { useProjectStore } from '../../stores/useProjectStore'
import { MessageSquare, MoreHorizontal, Trash2, Edit2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'

export function SessionListView() {
  const sessions = useProjectStore(state => state.sessions)
  const activeSessionId = useProjectStore(state => state.activeSessionId)
  const switchSession = useProjectStore(state => state.switchSession)
  const deleteSession = useProjectStore(state => state.deleteSession)
  const renameSession = useProjectStore(state => state.renameSession)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }

  const submitRename = () => {
    if (editingId && editName.trim()) {
      renameSession(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSession(id)
    }
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {sessions.length === 0 && (
        <div className="text-center text-xs text-zinc-400 py-4">
          No sessions yet.
        </div>
      )}
      {sessions.map(session => (
        <div
          key={session.id}
          onClick={() => switchSession(session.id)}
          className={cn(
            'group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors',
            activeSessionId === session.id
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            {editingId === session.id ? (
              <input
                autoFocus
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={submitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            ) : (
              <span className="text-sm truncate">{session.title}</span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem
                onClick={e => {
                  e.stopPropagation()
                  handleRename(session.id, session.title)
                }}
              >
                <Edit2 className="w-3 h-3 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={e => handleDelete(e, session.id)}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}
