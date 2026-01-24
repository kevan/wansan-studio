import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useWizardStore } from '@/stores/useWizardStore'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import {
  Check,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  X,
  ShieldCheck,
  Globe,
  Settings2,
  Search,
  ChevronDown,
  ChevronRight,
  LayoutGrid
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { DBConnectionConfig } from '@shared/types'
import { useTranslation } from 'react-i18next'
import { IngestionTask } from '@shared/types/wizard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip'

const BUSINESS_TYPES = [
  { id: 'postgres', name: 'PostgreSQL', icon: 'P' },
  { id: 'mysql', name: 'MySQL', icon: 'M' }
]

export function DatabaseSelectorDialog() {
  const { isDbSelectorOpen, setDbSelectorOpen, tasks, setTasks, mode } = useWizardStore()
  const { dbConnections, addDBConnection, removeDBConnection } = useSettingsStore()
  const { t } = useTranslation('common')

  const [selectedConnId, setSelectedConnId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [tables, setTables] = useState<Array<{ name: string; schema?: string }>>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSchemas, setCollapsedSchemas] = useState<Set<string>>(new Set())
  
  // Local Selection State (Map<ConnID, Set<FullIdentifier>>)
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

  // Grouping Logic
  const groupedTables = useMemo(() => {
    const filtered = tables.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.schema && t.schema.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    const groups: Record<string, typeof tables> = {}
    filtered.forEach(t => {
      const schema = t.schema || 'default'
      if (!groups[schema]) groups[schema] = []
      groups[schema].push(t)
    })
    const sortedSchemas = Object.keys(groups).sort((a, b) => {
      if (a === 'public') return -1
      if (b === 'public') return 1
      return a.localeCompare(b)
    })
    return { groups, sortedSchemas, totalCount: filtered.length }
  }, [tables, searchQuery])

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
    setTestSuccess(false)
    setPassword('')
  }

  const getFullId = (table: { name: string; schema?: string }) => {
    return table.schema ? `${table.schema}.${table.name}` : table.name
  }

  const toggleTable = (table: { name: string; schema?: string }) => {
    if (!selectedConnId) return
    const fullId = getFullId(table)
    setLocalSelection(prev => {
      const currentSet = new Set(prev[selectedConnId] || [])
      if (currentSet.has(fullId)) currentSet.delete(fullId)
      else currentSet.add(fullId)
      return { ...prev, [selectedConnId]: currentSet }
    })
  }

  const toggleSchema = (schema: string) => {
    setCollapsedSchemas(prev => {
      const next = new Set(prev)
      if (next.has(schema)) next.delete(schema)
      else next.add(schema)
      return next
    })
  }

  const isTableSelected = (table: { name: string; schema?: string }) => {
    if (!selectedConnId) return false
    return localSelection[selectedConnId]?.has(getFullId(table))
  }

  const handleConfirm = () => {
    const newTasks: IngestionTask[] = []
    Object.entries(localSelection).forEach(([connId, tableSet]) => {
      const conn = dbConnections.find(c => c.id === connId)
      if (!conn) return
      tableSet.forEach(fullId => {
        const exists = tasks.some(t => t.connectionId === connId && t.sourceName === fullId)
        if (!exists) {
          newTasks.push({
            id: crypto.randomUUID(),
            sourceName: fullId,
            fileName: `${conn.name} (${conn.type})`,
            connectionId: connId,
            filePath: '',
            tableName: '',
            finalTableName: '',
            finalDisplayName: fullId,
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
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none rounded-3xl bg-white"
      >
        <div className="flex h-full min-h-0">
          {/* Sidebar */}
          <div className="w-64 border-r border-zinc-100 flex flex-col bg-zinc-50/50 shrink-0">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-white/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {t('connector.saved_connections', 'Connectors')}
              </span>
              <button
                onClick={() => { setIsCreating(true); setSelectedConnId(null); setError(null); setTestSuccess(false) }}
                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                title="New Connection"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {dbConnections.map(conn => (
                <div
                  key={conn.id}
                  onClick={() => { setSelectedConnId(conn.id); setIsCreating(false) }}
                  className={cn(
                    'group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border',
                    selectedConnId === conn.id 
                      ? 'bg-white border-zinc-200 shadow-sm text-zinc-900 ring-1 ring-zinc-100' 
                      : 'border-transparent text-zinc-500 hover:bg-zinc-100'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                      conn.type === 'postgres' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {conn.type === 'postgres' ? 'PG' : 'MY'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate leading-tight">{conn.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono truncate">{conn.host}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeDBConnection(conn.id) }} 
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            {isCreating ? (
              /* --- NEW CONNECTION FORM --- */
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4">
                <div className="p-8 border-b border-zinc-50 shrink-0">
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{t('connector.new_connection', 'New Connector')}</h2>
                  <p className="text-sm text-zinc-500 mt-1">Configure your external database access.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Connection Name</Label>
                      <Input placeholder="e.g. Production DB" value={newConn.name} onChange={e => setNewConn(p => ({...p, name: e.target.value}))} className="rounded-xl border-zinc-100 focus:ring-indigo-500 h-11" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Database Type</Label>
                      <div className="flex bg-zinc-100/50 p-1 rounded-xl h-11">
                         {BUSINESS_TYPES.map(type => (
                           <button 
                             key={type.id}
                             onClick={() => setNewConn(p => ({...p, type: type.id as any, port: type.id === 'postgres' ? 5432 : 3306}))} 
                             className={cn(
                               "flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all",
                               newConn.type === type.id ? "bg-white shadow-sm text-indigo-600" : "text-zinc-400 hover:text-zinc-600"
                             )}
                           >
                             {type.name}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100" />

                  {/* Network Config */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-3">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <Globe className="w-3 h-3" /> Host
                      </Label>
                      <Input placeholder="localhost or IP" value={newConn.host} onChange={e => setNewConn(p => ({...p, host: e.target.value}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Port</Label>
                      <Input placeholder="5432" type="number" value={newConn.port} onChange={e => setNewConn(p => ({...p, port: parseInt(e.target.value)}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <Database className="w-3 h-3" /> Database Name
                      </Label>
                      <Input placeholder="postgres" value={newConn.database} onChange={e => setNewConn(p => ({...p, database: e.target.value}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <Settings2 className="w-3 h-3" /> User
                      </Label>
                      <Input placeholder="username" value={newConn.user} onChange={e => setNewConn(p => ({...p, user: e.target.value}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <ShieldCheck className="w-3 h-3" /> Password
                    </Label>
                    <Input placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl border-zinc-100 h-11" />
                  </div>

                  {testSuccess && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold"><Check className="w-5 h-5" /> Connection Successful!</div>}
                  {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"><X className="w-5 h-5" /> {error}</div>}
                </div>

                <div className="p-8 border-t border-zinc-50 flex justify-between items-center bg-zinc-50/30">
                   <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || !newConn.host} className="rounded-xl h-12 px-6 font-bold border-zinc-200">
                      {isTesting ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Test Connection
                   </Button>
                   <div className="flex gap-3">
                     <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
                     <Button onClick={handleSaveConnection} disabled={!newConn.name || !newConn.host} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-10 font-bold shadow-lg shadow-indigo-100">
                       Create Connector
                     </Button>
                   </div>
                </div>
              </div>
            ) : selectedConn ? (
              /* --- TABLE SELECTION VIEW (GROUPED) --- */
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center pr-16 bg-white shrink-0 z-10">
                   <div className="flex flex-col">
                      <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{selectedConn.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded tracking-widest">{selectedConn.type}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{selectedConn.host}:{selectedConn.port}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <Input 
                          placeholder={`Search ${groupedTables.totalCount} tables...`}
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-9 h-10 w-56 rounded-xl border-zinc-100 focus:ring-indigo-500 text-xs shadow-sm"
                        />
                     </div>
                     <Button variant="outline" size="sm" onClick={() => fetchTables(selectedConn.id)} disabled={isLoadingTables} className="rounded-xl border-zinc-200 font-bold h-10">
                       <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoadingTables && "animate-spin")} /> Refresh
                     </Button>
                   </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-zinc-50/30 p-6 scroll-smooth">
                   {groupedTables.sortedSchemas.map(schema => {
                     const isCollapsed = collapsedSchemas.has(schema)
                     const schemaTables = groupedTables.groups[schema]
                     
                     return (
                       <div key={schema} className="mb-6 last:mb-0">
                         {/* Schema Header */}
                         <div 
                           className="flex items-center gap-2 mb-3 cursor-pointer group select-none sticky top-0 bg-zinc-50/95 backdrop-blur-sm py-2 z-10 border-b border-zinc-100/50"
                           onClick={() => toggleSchema(schema)}
                         >
                           <div className="p-1 rounded hover:bg-zinc-200 text-zinc-400">
                             {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </div>
                           <div className="flex items-baseline gap-2">
                             <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                               <LayoutGrid className="w-4 h-4 text-zinc-400" />
                               {schema}
                             </h3>
                             <span className="text-[10px] text-zinc-400 font-mono">({schemaTables.length} tables)</span>
                           </div>
                           <div className="h-px bg-zinc-200 flex-1 ml-4 opacity-30" />
                         </div>

                         {/* Tables Grid */}
                         {!isCollapsed && (
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1">
                             {schemaTables.map(table => {
                               const isSelected = isTableSelected(table)
                               const fullId = getFullId(table)
                               const isAlreadyInTasks = tasks.some(t => t.connectionId === selectedConnId && t.sourceName === fullId)
                               const isLongName = table.name.length > 25

                               return (
                                 <TooltipProvider key={fullId}>
                                   <Tooltip delayDuration={500}>
                                     <TooltipTrigger asChild>
                                       <div 
                                         onClick={() => !isAlreadyInTasks && toggleTable(table)}
                                         className={cn(
                                           "relative p-3 border rounded-xl flex items-start gap-3 transition-all", 
                                           isSelected 
                                            ? "border-indigo-600 bg-white ring-2 ring-indigo-50 shadow-md shadow-indigo-50/50" 
                                            : "border-zinc-200 bg-white hover:border-indigo-300 hover:shadow-sm",
                                           isAlreadyInTasks ? "opacity-50 cursor-not-allowed grayscale bg-zinc-50" : "cursor-pointer active:scale-95"
                                         )}
                                       >
                                         <div className={cn(
                                           "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                           isSelected ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-400"
                                         )}>
                                          <Database className="w-4 h-4" />
                                         </div>
                                         <div className="flex flex-col min-w-0 flex-1">
                                            <span className={cn(
                                              "text-xs font-bold text-zinc-900 block",
                                              isLongName ? "truncate" : "break-words"
                                            )}>
                                              {table.name}
                                            </span>
                                            
                                            {/* Subtitle Schema */}
                                            <span className="text-[9px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                                              {table.schema || 'default'}
                                            </span>
                                         </div>
                                         
                                         {/* Status Icons */}
                                         {isSelected && <div className="absolute top-2 right-2"><Check className="w-3.5 h-3.5 text-indigo-600 stroke-[4]" /></div>}
                                         {isAlreadyInTasks && <div className="absolute top-2 right-2"><Check className="w-3.5 h-3.5 text-zinc-300 stroke-[4]" /></div>}
                                       </div>
                                     </TooltipTrigger>
                                     <TooltipContent>
                                       <p className="font-mono text-xs">{fullId}</p>
                                     </TooltipContent>
                                   </Tooltip>
                                 </TooltipProvider>
                               )
                             })}
                           </div>
                         )}
                       </div>
                     )
                   })}
                   
                   {groupedTables.totalCount === 0 && !isLoadingTables && (
                      <div className="py-32 text-center">
                        <Database className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                        <p className="text-sm text-zinc-400 font-bold">No tables match your search.</p>
                      </div>
                   )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                  <Server className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">Select or create a connector</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-zinc-900">{totalSelected} tables selected</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDbSelectorOpen(false)} className="rounded-xl font-bold px-6">Cancel</Button>
            <Button 
              onClick={handleConfirm} 
              disabled={totalSelected === 0} 
              className="bg-zinc-900 hover:bg-black text-white rounded-xl px-10 font-bold shadow-xl shadow-zinc-100 transition-all disabled:opacity-30 active:scale-95 h-12"
            >
              Add to Queue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", className)}>
      {children}
    </span>
  )
}
