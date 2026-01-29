import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Coins } from 'lucide-react'
import debounce from 'lodash.debounce'
import { cn } from '@/utils/cn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TokenBudgetConfig } from '@shared/types/token-audit'
import { useToastStore } from '@/stores/useToastStore'

export function TokenAuditTab() {
  const { t } = useTranslation('settings')
  const addToast = useToastStore(state => state.addToast)
  
  const [config, setConfig] = useState<TokenBudgetConfig | null>(null)
  const [usage, setUsage] = useState<{
    dailyUsageUSD: number,
    inputTokens: number,
    outputTokens: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [cfgRes, usageRes] = await Promise.all([
        window.electronAPI.getTokenConfig(),
        window.electronAPI.getTokenUsage()
      ])
      
      if (cfgRes.success && cfgRes.data) {
        setConfig(cfgRes.data)
      }
      if (usageRes.success && usageRes.data) {
        setUsage(usageRes.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-save logic
  const debouncedSave = useMemo(
    () =>
      debounce(async (newConfig: TokenBudgetConfig) => {
        try {
          const res = await window.electronAPI.setTokenConfig(newConfig)
          if (!res.success) {
            addToast({ title: res.error || 'Failed to save settings', type: 'error' })
          }
        } catch (e) {
          console.error('Failed to auto-save token config:', e)
        }
      }, 1000),
    [addToast]
  )

  const updateConfig = useCallback((updates: Partial<TokenBudgetConfig>) => {
    if (!config) return
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    debouncedSave(newConfig)
  }, [config, debouncedSave])

  if (loading && !config) return <div className="p-4">Loading...</div>

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            {t('audit.title')}
          </h4>
          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
            <Label htmlFor="budget-protection" className="text-xs font-medium text-zinc-500 cursor-pointer">
              {t('audit.protection_toggle', 'Enable Protection')}
            </Label>
            <Switch 
              id="budget-protection"
              checked={config?.isEnabled}
              onCheckedChange={checked => updateConfig({ isEnabled: checked })}
            />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
           <Card className="rounded-2xl border-zinc-100 shadow-sm">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground">
                 {t('audit.daily_usage')}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold tabular-nums">
                 ${(usage?.dailyUsageUSD ?? 0).toFixed(4)}
               </div>
               <p className="text-[10px] text-muted-foreground mt-1">
                 {t('audit.resets_daily')}
               </p>
             </CardContent>
           </Card>

           <Card className="rounded-2xl border-zinc-100 shadow-sm">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground">
                 {t('audit.tokens')}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-xl font-bold tabular-nums">
                 {((usage?.inputTokens ?? 0) / 1000).toFixed(1)}k / {((usage?.outputTokens ?? 0) / 1000).toFixed(1)}k
               </div>
               <p className="text-[10px] text-muted-foreground mt-1">
                 Total: {((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)).toLocaleString()}
               </p>
             </CardContent>
           </Card>
           
           <Card className="rounded-2xl border-zinc-100 shadow-sm">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground">
                 {t('audit.budget_status')}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className={cn(
                 "text-xl font-bold",
                 config?.isEnabled ? "text-emerald-600" : "text-zinc-400"
               )}>
                 {config?.isEnabled ? t('audit.active') : t('audit.disabled', 'Disabled')}
               </div>
               <p className="text-[10px] text-muted-foreground mt-1">
                 {config?.isEnabled ? t('audit.protection_enabled') : t('audit.protection_disabled', 'Protection is off')}
               </p>
             </CardContent>
           </Card>
        </div>
      </section>
      
      <section className="space-y-4">
        {/* Limits - Tied to isEnabled */}
        <div className={cn("space-y-4 transition-opacity", !config?.isEnabled && "opacity-50 pointer-events-none")}>
          <div className="space-y-2">
            <Label>{t('audit.daily_hard_limit')}</Label>
            <Input 
              type="number" 
              step="0.1"
              min="0"
              value={config?.dailyHardLimitUSD || ''} 
              onChange={e => updateConfig({ dailyHardLimitUSD: parseFloat(e.target.value) || 0 })}
              className="rounded-xl border-zinc-200"
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {t('audit.hard_limit_desc')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('audit.project_soft_limit')}</Label>
            <Input 
              type="number" 
              step="0.1"
              min="0"
              value={config?.projectSoftLimitUSD || ''} 
              onChange={e => updateConfig({ projectSoftLimitUSD: parseFloat(e.target.value) || 0 })}
              className="rounded-xl border-zinc-200"
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {t('audit.soft_limit_desc')}
            </p>
          </div>
        </div>

        {/* Multiplier - Always Enabled */}
        <div className="space-y-2 pt-2 border-t border-zinc-50">
           <Label>{t('audit.price_multiplier')}</Label>
           <Input 
             type="number" 
             step="0.01"
             min="0.01"
             value={config?.priceMultiplier || ''} 
             placeholder="1.0"
             onChange={e => updateConfig({ priceMultiplier: parseFloat(e.target.value) || 1.0 })}
             className="rounded-xl border-zinc-200"
           />
           <p className="text-[10px] text-muted-foreground leading-relaxed">
             {t('audit.multiplier_desc')}
           </p>
        </div>
      </section>
    </div>
  )
}
