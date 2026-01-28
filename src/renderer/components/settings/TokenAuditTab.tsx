import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Coins } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TokenBudgetConfig } from '@shared/types/token-audit'
import { useToastStore } from '@/stores/useToastStore'

export function TokenAuditTab() {
  const { t } = useTranslation('settings')
  const addToast = useToastStore(state => state.addToast)
  
  const [config, setConfig] = useState<TokenBudgetConfig | null>(null)
  const [usage, setUsage] = useState<{ dailyUsageUSD: number } | null>(null)
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

  const handleSave = async () => {
    if (!config) return
    try {
      const res = await window.electronAPI.setTokenConfig(config)
      if (res.success) {
        addToast({ title: t('audit.saved', 'Settings saved'), type: 'success' })
      } else {
        addToast({ title: res.error || 'Failed', type: 'error' })
      }
    } catch {
       addToast({ title: 'Error saving settings', type: 'error' })
    }
  }

  if (loading && !config) return <div className="p-4">Loading...</div>

  return (
    <div className="space-y-6">
      <section>
        <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-500" />
          {t('audit.title', 'Cost Control & Audit')}
        </h4>
        
        <div className="grid gap-4 md:grid-cols-2">
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground">
                 {t('audit.daily_usage', 'Today\'s Usage')}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">
                 ${usage?.dailyUsageUSD.toFixed(4) || '0.0000'}
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 {t('audit.resets_daily', 'Resets at midnight')}
               </p>
             </CardContent>
           </Card>
           
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground">
                 {t('audit.budget_status', 'Budget Status')}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-green-600">
                 Active
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 {t('audit.protection_enabled', 'Hard limit protection on')}
               </p>
             </CardContent>
           </Card>
        </div>
      </section>
      
      <section className="space-y-4">
        <div className="space-y-2">
           <Label>{t('audit.daily_hard_limit', 'Daily Hard Limit ($)')}</Label>
           <Input 
             type="number" 
             step="0.1"
             value={config?.dailyHardLimitUSD || ''} 
             onChange={e => setConfig(prev => prev ? ({ ...prev, dailyHardLimitUSD: parseFloat(e.target.value) }) : null)}
           />
           <p className="text-[10px] text-muted-foreground">
             {t('audit.hard_limit_desc', 'AI requests will be blocked if this limit is exceeded.')}
           </p>
        </div>

        <div className="space-y-2">
           <Label>{t('audit.project_soft_limit', 'Batch Warning Threshold ($)')}</Label>
           <Input 
             type="number" 
             step="0.1"
             value={config?.projectSoftLimitUSD || ''} 
             onChange={e => setConfig(prev => prev ? ({ ...prev, projectSoftLimitUSD: parseFloat(e.target.value) }) : null)}
           />
           <p className="text-[10px] text-muted-foreground">
             {t('audit.soft_limit_desc', 'Confirmations required for batch jobs exceeding this estimated cost.')}
           </p>
        </div>
        
        <Button onClick={handleSave} className="mt-4">
          {t('save', 'Save Changes')}
        </Button>
      </section>
    </div>
  )
}
