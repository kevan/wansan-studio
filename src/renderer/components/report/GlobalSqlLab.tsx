import { useSqlLabStore } from '@/stores/useSqlLabStore'
import { SqlEditorModal } from './sql-editor-modal'

export function GlobalSqlLab() {
  const session = useSqlLabStore(state => state.session)
  const close = useSqlLabStore(state => state.close)

  if (!session) return null

  return (
    <SqlEditorModal
      isOpen={!!session}
      onClose={close}
      mode={session.mode}
      targetTitle={session.targetTitle}
      initialSql={session.initialSql}
      initialData={[]}
      initialColumns={session.initialColumns}
      initialColumnTypes={session.initialColumnTypes}
      onSave={
        session.onSave
          ? async sql => {
              if (session.onSave) {
                await session.onSave(sql)
              }
            }
          : undefined
      }
    />
  )
}
