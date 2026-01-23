import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useWizardStore } from '@/stores/useWizardStore'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import {
  AlertCircle,
  Check,
  ChevronRight,
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

export function DatabaseConnectorView() {
  const { dbConnections, addDBConnection, removeDBConnection } = useSettingsStore()
  const { setTasks, setStep } = useWizardStore()
  const { t } = useTranslation('common')

  const [selectedConnId, setSelectedConnId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [tables, setTables] = useState<Array<{ name: string; schema?: string }>>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState(false)

  // New Connection Form
  const [newConn, setNewConn] = useState<Partial<DBConnectionConfig>>({
    type: 'postgres',
    port: 5432,
    host: 'localhost',
  })
  const [password, setPassword] = useState('')

  // Clear test success when any field changes
  useEffect(() => {
    setTestSuccess(false)
  }, [newConn, password])

  const selectedConn = dbConnections.find(c => c.id === selectedConnId)

  // Load tables when connection is selected
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

  const handleTestConnection = async () => {
    setIsTesting(true)
    setError(null)
    setTestSuccess(false)
    try {
      const res = await window.electronAPI.testDBConnection(newConn as DBConnectionConfig, password)
      if (res.success && res.data) {
        setTestSuccess(true)
      } else {
        setError(res.error || 'Connection failed')
      }
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

  const handleSyncTable = async (tableName: string) => {
    if (!selectedConn) return
    setIsSyncing(true)
    setError(null)
    try {
      // 1. Backend Sync (Snapshot)
      const localTableName = `t_${tableName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      const res = await window.electronAPI.syncDBTable(selectedConn, tableName, localTableName)
      
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Sync failed')
      }

      // 2. Convert to IngestionTask
      const task: IngestionTask = {
        id: crypto.randomUUID(),
        sourceName: tableName,
        fileName: `${selectedConn.name} (${selectedConn.type})`,
        filePath: `db://${selectedConn.id}/${tableName}`, // Virtual path
        tableName: localTableName,
        finalTableName: localTableName,
        finalDisplayName: tableName,
        columns: res.data.columns.map(c => ({
          name: c.name,
          type: c.type as any,
          isPrimaryKey: false // TODO: Support PK detection
        })),
        previewData: [], // Backend already synced, we don't need preview here or we fetch later
        rowCount: res.data.rowCount,
        mode: 'import',
        status: 'pending'
      }

      // 3. Update Wizard
      setTasks([task])
      setStep('preview') // Move to preview step
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="h-full flex gap-0 overflow-hidden bg-white">
      {/* Sidebar: Connection List */}
      <div className="w-64 border-r border-zinc-100 flex flex-col bg-zinc-50/50">
        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-white/50">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {t('connector.saved_connections')}
          </span>
          <button
            onClick={() => {
              setIsCreating(true)
              setSelectedConnId(null)
            }}
            className="p-1 hover:bg-zinc-100 rounded text-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {dbConnections.map(conn => (
            <div
              key={conn.id}
              onClick={() => {
                setSelectedConnId(conn.id)
                setIsCreating(false)
              }}
              className={cn(
                'group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent',
                selectedConnId === conn.id
                  ? 'bg-white border-zinc-200 shadow-sm text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  selectedConnId === conn.id ? "bg-indigo-50 text-indigo-600" : "bg-zinc-200 text-zinc-400"
                )}>
                  <Server className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{conn.name}</span>
                  <span className="text-[9px] uppercase tracking-tighter opacity-60">
                    {conn.type} · {conn.host}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeDBConnection(conn.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {dbConnections.length === 0 && !isCreating && (
            <div className="py-12 px-4 text-center">
              <Database className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
              <p className="text-[10px] text-zinc-400 font-medium">{t('connector.no_connections')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Form or Table List */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {isCreating ? (
          <div className="flex-1 overflow-y-auto p-12 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-right-2">
            <h2 className="text-2xl font-black text-zinc-900 mb-8 tracking-tight uppercase">
              {t('connector.new_connection')}
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_name')}</label>
                <Input
                  placeholder="Production PostgreSQL"
                  value={newConn.name || ''}
                  onChange={e => setNewConn(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Type</label>
                <div className="flex bg-zinc-100 p-1 rounded-xl">
                  <button
                    onClick={() => setNewConn(p => ({ ...p, type: 'postgres', port: 5432 }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                      newConn.type === 'postgres' ? "bg-white shadow-sm" : "text-zinc-400"
                    )}
                  >PostgreSQL</button>
                  <button
                    onClick={() => setNewConn(p => ({ ...p, type: 'mysql', port: 3306 }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                      newConn.type === 'mysql' ? "bg-white shadow-sm" : "text-zinc-400"
                    )}
                  >MySQL</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_host')}</label>
                <Input
                  placeholder="localhost"
                  value={newConn.host || ''}
                  onChange={e => setNewConn(p => ({ ...p, host: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_port')}</label>
                <Input
                  type="number"
                  value={newConn.port || ''}
                  onChange={e => setNewConn(p => ({ ...p, port: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_db')}</label>
                <Input
                  placeholder="main_db"
                  value={newConn.database || ''}
                  onChange={e => setNewConn(p => ({ ...p, database: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_user')}</label>
                <Input
                  placeholder="postgres"
                  value={newConn.user || ''}
                  onChange={e => setNewConn(p => ({ ...p, user: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('connector.form_pass')}</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between border-t border-zinc-100 pt-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="gap-2 text-zinc-500 font-bold"
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {t('connector.btn_test')}
                </Button>
                {testSuccess && (
                  <div className="flex items-center gap-1.5 text-green-600 animate-in fade-in zoom-in-95">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Passed
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsCreating(false)}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleSaveConnection}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                >
                  {t('connector.btn_save')}
                </Button>
              </div>
            </div>
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium animate-in shake-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        ) : selectedConn ? (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in">
            {/* Table Selection Header */}
            <div className="p-8 border-b border-zinc-100 flex justify-between items-end shrink-0">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 leading-none">
                  {selectedConn.name}
                </h2>
                <p className="text-3xl font-black text-zinc-900 mt-2">
                  {t('connector.select_table')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTables(selectedConn.id)}
                disabled={isLoadingTables}
                className="gap-2 border-zinc-200 bg-white"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingTables && "animate-spin")} />
                {t('connector.btn_refresh')}
              </Button>
            </div>

            {/* Table List */}
            <div className="flex-1 overflow-y-auto p-8">
              {isLoadingTables ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 opacity-20" />
                  <span className="text-sm font-medium text-zinc-400 italic">{t('connector.fetching_schema')}</span>
                </div>
              ) : error ? (
                <div className="py-20 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 font-bold">{error}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tables.map(table => (
                    <div
                      key={table.name}
                      onClick={() => !isSyncing && handleSyncTable(table.name)}
                      className={cn(
                        "group p-4 bg-white border border-zinc-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-sm flex items-center justify-between",
                        isSyncing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-zinc-50 group-hover:bg-indigo-100 rounded-xl transition-colors">
                          <Database className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-zinc-900 truncate">{table.name}</span>
                          {table.schema && (
                            <span className="text-[10px] text-zinc-400 uppercase font-medium">{table.schema}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loading Overlay for Sync */}
            {isSyncing && (
              <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="p-8 bg-white rounded-3xl shadow-2xl border border-zinc-100 flex flex-col items-center gap-4 scale-110">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-900">{t('connector.syncing_snapshot')}</p>
                    <p className="text-xs text-zinc-400 mt-1 font-medium italic">{t('connector.sync_desc')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center mb-6">
              <Server className="w-10 h-10 text-zinc-200" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
              {t('connector.title')}
            </h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-sm">
              {t(
                'connector.landing_desc',
                'Connect to your local MySQL or PostgreSQL database to analyze live data using AI.'
              )}
            </p>
            <Button
              variant="outline"
              onClick={() => setIsCreating(true)}
              className="mt-8 border-zinc-200 font-bold bg-white text-zinc-900 hover:bg-zinc-50 px-8"
            >
              {t('connector.new_connection')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
