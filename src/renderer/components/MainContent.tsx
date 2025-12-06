import React, { useState } from 'react'
import { WelcomeScreen } from './WelcomeScreen'
import { DataWorkspace } from './DataWorkspace'

export function MainContent() {
  const [hasData, setHasData] = useState(false)
  const [currentTable, setCurrentTable] = useState<string | null>(null)

  const handleDataImported = (tableName: string) => {
    setCurrentTable(tableName)
    setHasData(true)
  }

  const handleReset = () => {
    setHasData(false)
    setCurrentTable(null)
  }

  return (
    <div className="w-full">
      {!hasData ? (
        <WelcomeScreen onDataImported={handleDataImported} />
      ) : (
        <DataWorkspace 
          tableName={currentTable!} 
          onReset={handleReset}
        />
      )}
    </div>
  )
}
