import React from 'react'
import { DashboardCanvasV3 } from "@/components/dashboard-v3"
import { DashboardHeader } from './mocks/MockNullComponent'

export function App() {
  return (
    <div className="w-screen h-screen bg-zinc-100 overflow-hidden flex flex-col">
      <DashboardHeader />
      <div className="flex-1 overflow-hidden relative">
        <DashboardCanvasV3 isPresentationMode={true} />
      </div>
    </div>
  )
}
