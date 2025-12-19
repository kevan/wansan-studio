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

  const readyFiles = files.filter(f => f.status === 'ready')
  const hasReadyFiles = readyFiles.length > 0
  const currentView = activeView

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* macOS 拖动区域 */}

      {/* 中间面板头部 */}
      {/*{currentView !== 'schema' && (*/}
      {/*  <header className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-white/80 backdrop-blur sticky top-0 z-20">*/}
      {/*    <div className="flex items-center gap-2 flex-1">*/}
      {/*      <div className="h-8 px-2 flex items-center">*/}
      {/*        <span className="font-semibold text-sm leading-none">*/}
      {/*          {currentView === 'chat' && t('analysis_chat')}*/}
      {/*          {currentView === 'relationships' &&*/}
      {/*            t('relationship_manager')}*/}
      {/*        </span>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </header>*/}
      {/*)}*/}

      {/* 根据状态显示不同界面 */}
      {!hasReadyFiles ? (
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
