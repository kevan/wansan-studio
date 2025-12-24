import { WelcomeScreen } from './WelcomeScreen'
import { ChatStream } from './ChatStream'
import { SchemaEditor } from './SchemaEditor'
import { useFileStore } from '../stores/useFileStore'
import { useProjectStore } from '../stores/useProjectStore'
import { RelationshipManager } from './data/relationship-manager'
import { DataWorkspaceLayout } from './DataWorkspaceLayout'
import { useTranslation } from 'react-i18next'

interface MainContentProps {
  showShowcase?: boolean
  showStyleTest?: boolean
  onCloseShowcase?: () => void
  onCloseStyleTest?: () => void
}

export function MainContent({}: MainContentProps) {
  const files = useFileStore(s => s.files)
  const activeView = useProjectStore(s => s.activeView)
  const { t } = useTranslation('common')

  const hasFiles = files.length > 0
  const currentView = activeView

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* 根据状态显示不同界面 */}
      {!hasFiles ? (
        <WelcomeScreen />
      ) : currentView === 'schema' ? (
        <div className="flex-1 overflow-hidden relative">
          <DataWorkspaceLayout>
            <SchemaEditor />
          </DataWorkspaceLayout>
        </div>
      ) : currentView === 'relationships' ? (
        <div className="flex-1 overflow-hidden relative">
          <DataWorkspaceLayout>
            <RelationshipManager />
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
