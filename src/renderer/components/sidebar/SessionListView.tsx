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
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { useTranslation } from 'react-i18next'

export function SessionListView() {
  const sessions = useProjectStore(state => state.sessions)
  const activeSessionId = useProjectStore(state => state.activeSessionId)
  const switchSession = useProjectStore(state => state.switchSession)
  const deleteSession = useProjectStore(state => state.deleteSession)
  const renameSession = useProjectStore(state => state.renameSession)
  const { t } = useTranslation('common')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

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
    setDeleteId(id)
  }

  const confirmDelete = () => {
    if (deleteId) {
      deleteSession(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        title={t('delete_session_title', 'Delete Session')}
        description={t(
          'delete_session_desc',
          'Are you sure you want to delete this session? This action cannot be undone.'
        )}
        onConfirm={confirmDelete}
        confirmText={t('delete', 'Delete')}
        cancelText={t('cancel', 'Cancel')}
        variant="destructive"
      />
      <div className="flex flex-col gap-0.5">
        {sessions.length === 0 && (
          <div className="text-center text-xs text-zinc-400 py-8">
            {t('no_sessions', 'No history yet.')}
          </div>
        )}
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => switchSession(session.id)}
            className={cn(
              'group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-all',
              activeSessionId === session.id
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold'
                : 'text-zinc-500 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200'
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <MessageSquare
                className={cn(
                  'w-4 h-4 flex-shrink-0 mt-0.5',
                  activeSessionId === session.id
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-400 dark:text-zinc-600'
                )}
              />
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
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                />
              ) : (
                <span className="text-sm truncate leading-tight tracking-tight">
                  {session.title || 'Untitled Session'}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
    </>
  )
}
