import { WelcomeScreen } from './WelcomeScreen'
import { ChatStream } from './ChatStream'
import { SchemaEditor } from './SchemaEditor'
import { useProjectStore } from '../stores/useProjectStore'
import { DataWorkspaceLayout } from './DataWorkspaceLayout'

export function MainContent() {
  const files = useProjectStore(s => s.files)
  const activeView = useProjectStore(s => s.activeView)

  const hasFiles = files.length > 0
  const currentView = activeView

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* 根据状态显示不同界面 */}
      {!hasFiles ? (
        <WelcomeScreen />
      ) : currentView === 'schema' ? (
        <div className="flex-1 overflow-hidden relative">
          <DataWorkspaceLayout showAction={true}>
            <SchemaEditor />
          </DataWorkspaceLayout>
        </div>
      ) : (
        <DataWorkspaceLayout showAction={false}>
          <ChatStream />
        </DataWorkspaceLayout>
      )}
    </div>
  )
}
