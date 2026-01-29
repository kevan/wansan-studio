import { WelcomeScreen } from './WelcomeScreen'
import { useProjectStore } from '../stores/useProjectStore'
import { DataWorkspace } from './data-workspace'
import { AnalysisWorkspace } from './analysis-workspace'

export function MainContent() {
  const files = useProjectStore(s => s.files)
  const appMode = useProjectStore(s => s.appMode)

  const hasFiles = files.length > 0

  if (!hasFiles) {
    return <WelcomeScreen />
  }

  if (appMode === 'data') {
    return <DataWorkspace />
  }

  return <AnalysisWorkspace />
}
