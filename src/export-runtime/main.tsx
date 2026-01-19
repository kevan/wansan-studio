import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '@/styles/globals.css'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import './mocks/i18n'
import i18n from './mocks/i18n'

// Data Injection Interface
interface WansanSnapshot {
  workbench: any
  project: any
  ui: any
  settings?: any
  lang?: 'en' | 'zh'
}

const snapshot = (window as any).__WANSAN_SNAPSHOT__ as WansanSnapshot

if (snapshot) {
  console.log('Hydrating from snapshot...', snapshot)
  
  // Set Language
  if (snapshot.lang) {
      i18n.changeLanguage(snapshot.lang)
  }

  if (snapshot.workbench) {
    (useWorkbenchStore as any).setState(snapshot.workbench)
  }
  
  if (snapshot.project) {
    (useProjectStore as any).setState(snapshot.project)
  }

  if (snapshot.ui) {
      (useUIStore as any).setState(snapshot.ui)
  }

  if (snapshot.settings) {
    (useSettingsStore as any).setState(snapshot.settings)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
