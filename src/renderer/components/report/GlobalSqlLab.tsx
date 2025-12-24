import { useSqlLabStore } from '@/stores/useSqlLabStore'
import { SqlEditorModal } from './sql-editor-modal'

export function GlobalSqlLab() {
  const session = useSqlLabStore(state => state.session)
  const close = useSqlLabStore(state => state.close)

  return (
    <SqlEditorModal
      isOpen={!!session}
      onClose={close}
      mode={session?.mode || 'widget'}
      targetTitle={session?.targetTitle}
      initialSql={session?.initialSql || ''}
      reasoning={session?.reasoning}
      onSave={session?.onSave}
    />
  )
}
