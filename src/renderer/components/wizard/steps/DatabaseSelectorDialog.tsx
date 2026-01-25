import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Globe,
  Settings2,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck
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

interface TableItemProps {
  name: string
  schema?: string
  fullId: string
  isSelected: boolean
  isAlreadyInTasks: boolean
  onToggle: (table: { name: string; schema?: string }) => void
}

const TableItemCard = React.memo(({ name, schema, fullId, isSelected, isAlreadyInTasks, onToggle }: TableItemProps) => {
  const { t } = useTranslation('common')
  return (
    <TooltipProvider>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div 
            onClick={() => !isAlreadyInTasks && onToggle({ name, schema })}
            className={cn(
              "relative h-14 px-4 py-2 border rounded-xl flex items-center gap-3", 
              isSelected 
                ? "border-indigo-600 bg-white ring-2 ring-indigo-50 shadow-md z-10" 
                : "border-zinc-100 bg-white hover:border-zinc-300 hover:shadow-sm",
              isAlreadyInTasks ? "opacity-40 cursor-not-allowed grayscale bg-zinc-50/50" : "cursor-pointer active:scale-95"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              isSelected ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-400"
            )}>
              <Database className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-bold text-zinc-900 truncate block leading-none">{name}</span>
              {isAlreadyInTasks ? (
                <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter mt-1">{t('selected_data')}</span>
              ) : (
                <span className="text-[9px] text-zinc-400 font-mono mt-1 truncate">{schema || 'default'}</span>
              )}
            </div>
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 bg-indigo-600 rounded-full p-0.5 shadow-sm">
                <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-900 border-none text-white rounded-lg text-[10px] font-mono">
          {fullId}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

TableItemCard.displayName = 'TableItemCard'

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
  
  const [localSelection, setLocalSelection] = useState<Record<string, Record<string, { name: string; schema?: string }>>>({})

  useEffect(() => {
    if (isDbSelectorOpen) {
      setLocalSelection({})
      if (dbConnections.length > 0 && !selectedConnId) {
        setSelectedConnId(dbConnections[0].id)
      }
    }
  }, [isDbSelectorOpen, dbConnections])

  const selectedConn = dbConnections.find(c => c.id === selectedConnId)

  useEffect(() => {
    if (selectedConnId) { void fetchTables(selectedConnId) } else { setTables([]) }
  }, [selectedConnId])

  const fetchTables = async (id: string) => {
    const conn = dbConnections.find(c => c.id === id)
    if (!conn) return
    setIsLoadingTables(true); setError(null)
    try {
      const res = await window.electronAPI.listDBTables(conn)
      if (res.success && res.data) setTables(res.data)
      else setError(res.error || 'Failed to list tables')
    } catch (e: any) { setError(e.message) } finally { setIsLoadingTables(false) }
  }

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

  const [newConn, setNewConn] = useState<Partial<DBConnectionConfig>>({
    type: 'postgres', port: 5432, host: 'localhost'
  })
  const [password, setPassword] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)

  const handleTestConnection = async () => {
    setIsTesting(true); setTestSuccess(false); setError(null)
    try {
      const res = await window.electronAPI.testDBConnection(newConn as DBConnectionConfig, password)
      if (res.success) setTestSuccess(true)
      else setError(res.error || 'Connection failed')
    } catch (e: any) { setError(e.message) } finally { setIsTesting(false) }
  }

  const handleSaveConnection = async () => {
    if (!newConn.name || !newConn.host) return
    const id = await addDBConnection(newConn as Omit<DBConnectionConfig, 'id'>, password)
    setIsCreating(false); setSelectedConnId(id); setTestSuccess(false); setPassword('')
  }

  const getFullId = useCallback((table: { name: string; schema?: string }) => {
    return table.schema ? `${table.schema}.${table.name}` : table.name
  }, [])

  const toggleTable = useCallback((table: { name: string; schema?: string }) => {
    if (!selectedConnId) return
    const fullId = getFullId(table)
    setLocalSelection(prev => {
      const connSelection = { ...(prev[selectedConnId] || {}) }
      if (connSelection[fullId]) {
        delete connSelection[fullId]
      } else {
        connSelection[fullId] = table
      }
      return { ...prev, [selectedConnId]: connSelection }
    })
  }, [selectedConnId, getFullId])

  const handleConfirm = () => {
    const newTasks: IngestionTask[] = []
    Object.entries(localSelection).forEach(([connId, tableMap]) => {
      const conn = dbConnections.find(c => c.id === connId)
      if (!conn) return
      Object.values(tableMap).forEach(table => {
        const fullId = getFullId(table)
        const exists = tasks.some(t => t.connectionId === connId && t.sourceName === fullId)
        if (!exists) {
          newTasks.push({
            id: crypto.randomUUID(), 
            sourceName: fullId, 
            fileName: `${conn.name} (${conn.type})`,
            connectionId: connId, 
            originalTableName: table.name,
            dbSchema: table.schema,
            filePath: '', 
            tableName: '', 
            finalTableName: '', 
            finalDisplayName: fullId,
            columns: [], previewData: [], rowCount: 0, mode, status: 'waiting_for_sync'
          })
        }
      })
    })
    setTasks([...tasks, ...newTasks]); setDbSelectorOpen(false)
  }

  const totalSelected = Object.values(localSelection).reduce((acc, map) => acc + Object.keys(map).length, 0)

  return (
    <Dialog open={isDbSelectorOpen} onOpenChange={setDbSelectorOpen}>
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-none rounded-3xl bg-white"
      >
        <div className="flex h-full min-h-0 text-zinc-900">
          <div className="w-64 border-r border-zinc-100 flex flex-col bg-zinc-50/50 shrink-0">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-white/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.saved_connections')}</span>
              <button onClick={() => { setIsCreating(true); setSelectedConnId(null); setError(null); setTestSuccess(false) }}
                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {dbConnections.map(conn => (
                <div key={conn.id} onClick={() => { setSelectedConnId(conn.id); setIsCreating(false) }}
                  className={cn('group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border',
                    selectedConnId === conn.id ? 'bg-white border-zinc-200 shadow-sm text-zinc-900 ring-1 ring-zinc-100' : 'border-transparent text-zinc-500 hover:bg-zinc-100')}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                      conn.type === 'postgres' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600")}>
                      {conn.type === 'postgres' ? 'PG' : 'MY'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate leading-tight">{conn.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono truncate">{conn.host}</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeDBConnection(conn.id) }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            {isCreating ? (
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4">
                <div className="p-8 border-b border-zinc-50 shrink-0">
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{t('connector.new_connection')}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{t('connector.landing_desc')}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_name')}</Label>
                      <Input placeholder="e.g. Production DB" value={newConn.name} onChange={e => setNewConn(p => ({...p, name: e.target.value}))} className="rounded-xl border-zinc-100 focus:ring-indigo-500 h-11" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('format')}</Label>
                      <div className="flex bg-zinc-100/50 p-1 rounded-xl h-11">
                         {BUSINESS_TYPES.map(type => (
                           <button key={type.id} onClick={() => setNewConn(p => ({...p, type: type.id as any, port: type.id === 'postgres' ? 5432 : 3306}))} 
                             className={cn("flex-1 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                               newConn.type === type.id ? "bg-white shadow-sm text-indigo-600" : "text-zinc-400 hover:text-zinc-600")}>
                             {type.name}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-100" />
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-3">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400"><Globe className="w-3 h-3" /> {t('connector.form_host')}</Label>
                      <Input placeholder="localhost" value={newConn.host} onChange={e => setNewConn(p => ({...p, host: e.target.value}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_port')}</Label>
                      <Input placeholder="5432" type="number" value={newConn.port} onChange={e => setNewConn(p => ({...p, port: parseInt(e.target.value)}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400"><Database className="w-3 h-3" /> {t('connector.form_db')}</Label>
                      <Input value={newConn.database} onChange={e => setNewConn(p => ({...p, database: e.target.value}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400"><Settings2 className="w-3 h-3" /> {t('connector.form_user')}</Label>
                      <Input value={newConn.user} onChange={e => setNewConn(p => ({...p, user: e.target.value}))} className="rounded-xl border-zinc-100 h-11" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400"><ShieldCheck className="w-3 h-3" /> {t('connector.form_pass')}</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl border-zinc-100 h-11" />
                  </div>
                  {testSuccess && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold">{t('settings_verify_connected')}</div>}
                  {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">{error}</div>}
                </div>
                <div className="p-8 border-t border-zinc-50 flex justify-end gap-3 shrink-0">
                   <Button variant="outline" onClick={handleTestConnection} disabled={isTesting} className="rounded-xl h-12 px-6 font-bold border-zinc-200">
                      {isTesting ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : <RefreshCw className="w-4 h-4 mr-2" />} {t('connector.btn_test')}
                   </Button>
                   <Button onClick={handleSaveConnection} disabled={!newConn.name || !newConn.host} className="bg-indigo-600 text-white rounded-xl h-12 px-10 font-bold shadow-lg shadow-indigo-100">{t('confirm')}</Button>
                </div>
              </div>
            ) : selectedConn ? (
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center pr-16 bg-white shrink-0 z-30">
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
                        <Input placeholder={t('connector.search_tables', { count: groupedTables.totalCount })} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-10 w-56 rounded-xl border-zinc-100 text-xs shadow-sm" />
                     </div>
                     <Button variant="outline" size="sm" onClick={() => fetchTables(selectedConn.id)} disabled={isLoadingTables} className="rounded-xl border-zinc-200 font-bold h-10">
                       <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoadingTables && "animate-spin")} /> {t('rerun')}
                     </Button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white scroll-smooth pb-12">
                   {groupedTables.sortedSchemas.map(schema => {
                     const isCollapsed = collapsedSchemas.has(schema)
                     const schemaTables = groupedTables.groups[schema]
                     const isOnlyOneGroup = groupedTables.sortedSchemas.length === 1 && schema === 'default'
                     const groupSelectedCount = schemaTables.filter(t => localSelection[selectedConnId!]?.[getFullId(t)]).length

                     return (
                       <div key={schema} className="mb-2 last:mb-0">
                         {!isOnlyOneGroup && (
                           <div className="sticky top-[-1px] bg-white border-b border-zinc-100 z-20 px-8 py-3 flex items-center justify-between group">
                             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCollapsedSchemas(prev => { const n = new Set(prev); if (n.has(schema)) n.delete(schema); else n.add(schema); return n; })}>
                               <div className="p-1 rounded-md hover:bg-zinc-100 text-zinc-400 transition-colors">
                                 {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                               </div>
                               <div className="flex items-center gap-2">
                                 <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('connector.schema_group', { name: schema })}</h3>
                                 <div className="bg-indigo-50 text-indigo-600 text-[9px] px-2 py-0.5 rounded-full font-black">
                                   {groupSelectedCount} / {schemaTables.length}
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}

                         {!isCollapsed && (
                           <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                             {schemaTables.map(table => {
                               const fullId = getFullId(table)
                               const isSelected = !!localSelection[selectedConnId!]?.[fullId]
                               const isAlreadyInTasks = tasks.some(t => t.connectionId === selectedConnId && t.sourceName === fullId)
                               return (
                                 <TableItemCard 
                                   key={fullId}
                                   name={table.name}
                                   schema={table.schema}
                                   fullId={fullId}
                                   isSelected={!!isSelected}
                                   isAlreadyInTasks={isAlreadyInTasks}
                                   onToggle={toggleTable}
                                 />
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
                        <p className="text-sm text-zinc-400 font-bold">{t('connector.no_tables_match')}</p>
                      </div>
                   )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6"><Server className="w-8 h-8 opacity-20" /></div>
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">{t('connector.no_connections')}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-zinc-100 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-2.5 h-2.5 rounded-full", totalSelected > 0 ? "bg-indigo-600 animate-pulse" : "bg-zinc-200")} />
            <span className="text-sm font-black text-zinc-900">{totalSelected} <span className="text-zinc-400 font-bold text-xs uppercase ml-1">{t('connector.selected_tables', { count: totalSelected })}</span></span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDbSelectorOpen(false)} className="rounded-xl font-bold px-6">{t('cancel')}</Button>
            <Button onClick={handleConfirm} disabled={totalSelected === 0} 
              className="bg-zinc-900 hover:bg-black text-white rounded-xl px-10 font-bold shadow-xl shadow-zinc-100 transition-all disabled:opacity-30 h-12">
              {t('confirm')} ({totalSelected})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}