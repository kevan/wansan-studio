import { useProjectStore } from '@/stores/useProjectStore'
import { SqlEditorModal } from './sql-editor-modal'

export function GlobalSqlLab() {
  const sqlLabSession = useProjectStore(state => state.sqlLabSession)
  const closeSqlLab = useProjectStore(state => state.closeSqlLab)

  if (!sqlLabSession) return null

  return (
    <SqlEditorModal
      isOpen={!!sqlLabSession}
      onClose={closeSqlLab}
      initialSql={sqlLabSession.initialSql}
      initialData={sqlLabSession.initialData}
      initialColumns={sqlLabSession.initialColumns}
      autoRun={sqlLabSession.mode === 'file'}
      onSave={
        sqlLabSession.onSave
          ? async sql => {
              if (sqlLabSession.onSave) {
                await sqlLabSession.onSave(sql)
              }
            }
          : undefined
      }
    />
  )
}
