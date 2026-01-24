import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useWizardStore } from '@/stores/useWizardStore'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import {
  Check,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Trash2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { DBConnectionConfig } from '@shared/types'
import { useTranslation } from 'react-i18next'
import { IngestionTask } from '@shared/types/wizard'

export function DatabaseSelectorDialog() {
  const { isDbSelectorOpen, setDbSelectorOpen, tasks, setTasks, mode } = useWizardStore()
  const { dbConnections, addDBConnection, removeDBConnection } = useSettingsStore()
  const { t } = useTranslation('common')

  const [selectedConnId, setSelectedConnId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [tables, setTables] = useState<Array<{ name: string; schema?: string }>>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Local Selection State (Map<ConnID, Set<TableName>>)
  const [localSelection, setLocalSelection] = useState<Record<string, Set<string>>>({})

  // Reset local selection when dialog opens
  useEffect(() => {
    if (isDbSelectorOpen) {
      setLocalSelection({})
      // Auto-select first connection if available
      if (dbConnections.length > 0 && !selectedConnId) {
        setSelectedConnId(dbConnections[0].id)
      }
    }
  }, [isDbSelectorOpen, dbConnections])

  const selectedConn = dbConnections.find(c => c.id === selectedConnId)

  // Load tables
  useEffect(() => {
    if (selectedConnId) {
      void fetchTables(selectedConnId)
    } else {
      setTables([])
    }
  }, [selectedConnId])

  const fetchTables = async (id: string) => {
    const conn = dbConnections.find(c => c.id === id)
    if (!conn) return
    setIsLoadingTables(true)
    setError(null)
    try {
      const res = await window.electronAPI.listDBTables(conn)
      if (res.success && res.data) {
        setTables(res.data)
      } else {
        setError(res.error || 'Failed to list tables')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoadingTables(false)
    }
  }

  // Connection Creation State
  const [newConn, setNewConn] = useState<Partial<DBConnectionConfig>>({
    type: 'postgres', port: 5432, host: 'localhost'
  })
  const [password, setPassword] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestSuccess(false)
    try {
      const res = await window.electronAPI.testDBConnection(newConn as DBConnectionConfig, password)
      if (res.success) setTestSuccess(true)
      else setError(res.error || 'Connection failed')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveConnection = async () => {
    if (!newConn.name || !newConn.host) return
    const id = await addDBConnection(newConn as Omit<DBConnectionConfig, 'id'>, password)
    setIsCreating(false)
    setSelectedConnId(id)
  }

  // Toggle Table Selection (Local)
  const toggleTable = (tableName: string) => {
    if (!selectedConnId) return
    setLocalSelection(prev => {
      const currentSet = new Set(prev[selectedConnId] || [])
      if (currentSet.has(tableName)) currentSet.delete(tableName)
      else currentSet.add(tableName)
      return { ...prev, [selectedConnId]: currentSet }
    })
  }

  const isTableSelected = (tableName: string) => {
    if (!selectedConnId) return false
    return localSelection[selectedConnId]?.has(tableName)
  }

  // Confirm Selection: Merge into Tasks
  const handleConfirm = () => {
    const newTasks: IngestionTask[] = []
    
    Object.entries(localSelection).forEach(([connId, tableSet]) => {
      const conn = dbConnections.find(c => c.id === connId)
      if (!conn) return

      tableSet.forEach(tableName => {
        // Avoid duplicates
        const exists = tasks.some(t => t.connectionId === connId && t.sourceName === tableName)
        if (!exists) {
          newTasks.push({
            id: crypto.randomUUID(),
            sourceName: tableName,
            fileName: `${conn.name} (${conn.type})`,
            connectionId: connId,
            filePath: '',
            tableName: '',
            finalTableName: '',
            finalDisplayName: tableName,
            columns: [],
            previewData: [],
            rowCount: 0,
            mode,
            status: 'waiting_for_sync'
          })
        }
      })
    })

    setTasks([...tasks, ...newTasks])
    setDbSelectorOpen(false)
  }

  // Count total selected items across all connections
  const totalSelected = Object.values(localSelection).reduce((acc, set) => acc + set.size, 0)

  return (
    <Dialog open={isDbSelectorOpen} onOpenChange={setDbSelectorOpen}>
      <DialogContent className="max-w-4xl h-[70vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r border-zinc-100 flex flex-col bg-zinc-50/50">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-white/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {t('connector.saved_connections')}
              </span>
              <button
                onClick={() => { setIsCreating(true); setSelectedConnId(null) }}
                className="p-1 hover:bg-zinc-100 rounded text-indigo-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {dbConnections.map(conn => (
                <div
                  key={conn.id}
                  onClick={() => { setSelectedConnId(conn.id); setIsCreating(false) }}
                  className={cn(
                    'group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent',
                    selectedConnId === conn.id ? 'bg-white border-zinc-200 shadow-sm text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Server className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold truncate">{conn.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeDBConnection(conn.id) }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {dbConnections.length === 0 && !isCreating && (
                <div className="py-12 px-4 text-center text-zinc-400 text-xs">No connections</div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            {isCreating ? (
              /* Create Form (Simplified) */
              <div className="flex-1 p-8 overflow-y-auto">
                <h2 className="text-xl font-bold mb-6">{t('connector.new_connection')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Name" value={newConn.name} onChange={e => setNewConn(p => ({...p, name: e.target.value}))} />
                  <div className="flex bg-zinc-100 p-1 rounded-lg">
                     <button onClick={() => setNewConn(p => ({...p, type: 'postgres'}))} className={cn("flex-1 py-1 rounded text-xs font-bold", newConn.type === 'postgres' ? "bg-white shadow" : "text-zinc-400")}>PG</button>
                     <button onClick={() => setNewConn(p => ({...p, type: 'mysql'}))} className={cn("flex-1 py-1 rounded text-xs font-bold", newConn.type === 'mysql' ? "bg-white shadow" : "text-zinc-400")}>MySQL</button>
                  </div>
                  <Input placeholder="Host" value={newConn.host} onChange={e => setNewConn(p => ({...p, host: e.target.value}))} />
                  <Input placeholder="Port" type="number" value={newConn.port} onChange={e => setNewConn(p => ({...p, port: parseInt(e.target.value)}))} />
                  <Input placeholder="Database" value={newConn.database} onChange={e => setNewConn(p => ({...p, database: e.target.value}))} />
                  <Input placeholder="User" value={newConn.user} onChange={e => setNewConn(p => ({...p, user: e.target.value}))} />
                  <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="mt-8 flex justify-end gap-3">
                   <Button variant="ghost" onClick={handleTestConnection} disabled={isTesting}>
                      {isTesting ? <Loader2 className="animate-spin w-4 h-4"/> : "Test Connection"}
                   </Button>
                   <Button onClick={handleSaveConnection}>Save</Button>
                </div>
                {testSuccess && <div className="text-green-600 text-xs mt-2 font-bold">Connection Successful</div>}
                {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
              </div>
            ) : selectedConn ? (
              /* Table Selection */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                   <h2 className="text-lg font-black text-zinc-900">{selectedConn.name}</h2>
                   <Button variant="outline" size="sm" onClick={() => fetchTables(selectedConn.id)} disabled={isLoadingTables}>
                     <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoadingTables && "animate-spin")} /> Refresh
                   </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-3 content-start">
                   {tables.map(table => {
                     const isSelected = isTableSelected(table.name)
                     const isAlreadyInTasks = tasks.some(t => t.connectionId === selectedConnId && t.sourceName === table.name)

                     return (
                       <div key={table.name} 
                         onClick={() => !isAlreadyInTasks && toggleTable(table.name)}
                         className={cn(
                           "p-3 border rounded-xl flex items-center justify-between transition-all", 
                           isSelected ? "border-indigo-600 bg-indigo-50/20" : "border-zinc-200 hover:border-indigo-300",
                           isAlreadyInTasks ? "opacity-40 cursor-not-allowed bg-zinc-50" : "cursor-pointer"
                         )}
                       >
                         <div className="flex items-center gap-3 overflow-hidden">
                           <Database className="w-4 h-4 text-zinc-400" />
                           <div className="flex flex-col min-w-0">
                             <span className="text-sm font-bold truncate">{table.name}</span>
                             {isAlreadyInTasks && (
                               <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Already added</span>
                             )}
                           </div>
                         </div>
                         {isSelected && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                         {isAlreadyInTasks && <Check className="w-4 h-4 text-zinc-300 stroke-[3]" />}
                       </div>
                     )
                   })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">Select a connection</div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <span className="text-xs font-bold text-zinc-500">{totalSelected} tables selected</span>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDbSelectorOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={totalSelected === 0} className="bg-black text-white hover:bg-zinc-800">
              Add {totalSelected} Tables
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
