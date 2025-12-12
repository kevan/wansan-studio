import { useCallback, useMemo, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Bot, AlertCircle } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { AI_PROVIDERS, type AIProviderKey } from '@/src/lib/constants'

type VerifyStatus = 'idle' | 'loading' | 'success' | 'error'

interface SettingsDialogProps {
  trigger?: React.ReactNode
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const settings = useSettingsStore()
  const setWorkbenchLanguage = useWorkbenchStore(state => state.setLanguage)
  const addToast = useToastStore(state => state.addToast)
  const { t } = useTranslation('settings')

  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle')
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)

  const providerConfig = AI_PROVIDERS[settings.provider]
  const modelOptions = useMemo(() => providerConfig.models, [providerConfig.models])

  const providerLabel = useMemo(() => {
    switch (settings.provider) {
      case 'openai':
        return t('ai.provider_openai')
      case 'deepseek':
        return t('ai.provider_deepseek')
      case 'moonshot':
        return t('ai.provider_moonshot')
      case 'custom':
        return t('ai.provider_custom')
      default:
        return settings.provider
    }
  }, [settings.provider, t])

  const languageLabel =
    settings.language === 'zh'
      ? t('general.language_zh')
      : t('general.language_en')

  const verifyConnection = useCallback(async () => {
    if (!settings.apiKey.trim()) {
      setVerifyStatus('error')
      setVerifyMessage(t('ai.verify_api_key_required'))
      addToast({
        title: t('ai.verify_failed_title'),
        description: t('ai.verify_failed_no_key_desc'),
        type: 'error',
        duration: 3500,
      })
      return
    }
    if (!settings.baseUrl.trim()) {
      setVerifyStatus('error')
      setVerifyMessage(t('ai.verify_base_url_required'))
      addToast({
        title: t('ai.verify_failed_title'),
        description: t('ai.verify_base_url_required'),
        type: 'error',
        duration: 3500,
      })
      return
    }

    setVerifyStatus('loading')
    setVerifyMessage(null)
    try {
      const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/models`, {
        headers: {
          Authorization: `Bearer ${settings.apiKey.trim()}`,
        },
      })
      if (!response.ok) {
        const message = t('ai.verify_http_error', {
          status: response.status,
        })
        setVerifyStatus('error')
        setVerifyMessage(message)
        addToast({
          title: t('ai.verify_failed_title'),
          description: message,
          type: 'error',
          duration: 4000,
        })
        return
      }
      setVerifyStatus('success')
      setVerifyMessage(t('ai.verify_connected'))
      addToast({
        title: t('ai.verify_connected_to_openai_title'),
        description: t('ai.verify_connected_to_openai_desc'),
        type: 'success',
        duration: 3000,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('ai.verify_network_error')
      setVerifyStatus('error')
      setVerifyMessage(message)
      addToast({
        title: t('ai.verify_failed_title'),
        description: message,
        type: 'error',
        duration: 4000,
      })
    }
  }, [addToast, settings.apiKey, settings.baseUrl, t])

  const VerifyIndicator = () => {
    if (verifyStatus === 'loading') {
      return <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
    }
    if (verifyStatus === 'success') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }
    if (verifyStatus === 'error') {
      return <XCircle className="h-4 w-4 text-red-600" />
    }
    return null
  }

  return (
    <Dialog>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 py-4 pb-10">
          <div className="flex flex-col gap-8">
            {/* SECTION 1: AI ENGINE */}
            <section>
              <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t('settings.section_ai')}
              </h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('ai.provider_label')}</label>
                  <Select
                    value={settings.provider}
                    onValueChange={value =>
                      settings.setProvider(value as AIProviderKey)
                    }
                  >
                    <SelectTrigger>
                      <span className="text-sm text-zinc-700 truncate">
                        {providerLabel || t('ai.select_provider_placeholder')}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">{t('ai.provider_openai')}</SelectItem>
                      <SelectItem value="deepseek">{t('ai.provider_deepseek')}</SelectItem>
                      <SelectItem value="moonshot">{t('ai.provider_moonshot')}</SelectItem>
                      <SelectItem value="custom">{t('ai.provider_custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label className="font-medium">{t('ai.api_key_label')}</label>
                  <div className="relative">
                    <Input
                      type="password"
                      className={cn(
                        "px-3 font-mono transition-colors",
                        "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-900",
                        !settings.apiKey && "border-destructive focus-visible:border-destructive"
                      )}
                      value={settings.apiKey}
                      onChange={e => settings.updateSettings({ apiKey: e.target.value })}
                      onBlur={() => void verifyConnection()}
                      placeholder="sk-..."
                    />
                  </div>
                  {/* Helper Link */}
                  {providerConfig.getKeyUrl ? (
                    <div className="text-xs text-muted-foreground">
                      {t('ai.get_key_hint_new')}{' '}
                      <a
                        href={providerConfig.getKeyUrl}
                        onClick={e => {
                          e.preventDefault()
                          const url = providerConfig.getKeyUrl
                          if (window.electronAPI?.openExternal) {
                            void window.electronAPI.openExternal(url)
                          } else {
                            window.open(url, '_blank', 'noopener,noreferrer')
                          }
                        }}
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {t('ai.get_key_link_new')} ↗
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* Verify Button - Keep it simple */}
                <div className="flex items-center gap-4">
                  <Button onClick={() => void verifyConnection()} disabled={verifyStatus === 'loading'} className="w-32">
                    {verifyStatus === 'loading' ? t('ai.verifying') : t('ai.verify_button')}
                  </Button>
                  {/* Error Text Separate */}
                  {verifyMessage && verifyStatus === 'error' && (
                    <span className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4"/> {verifyMessage}
                    </span>
                  )}
                  {verifyMessage && verifyStatus === 'success' && (
                    <span className="text-sm text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4"/> {verifyMessage}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('ai.model_label')}</label>
                  {settings.provider === 'custom' ? (
                    <Input
                      value={settings.model}
                      onChange={e => settings.updateSettings({ model: e.target.value })}
                      placeholder={t('ai.custom_model_placeholder')}
                    />
                  ) : (
                    <Select
                      value={settings.model}
                      onValueChange={value => settings.updateSettings({ model: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('ai.select_model_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map(m => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('ai.base_url_label')}</label>
                  <Input
                    value={settings.baseUrl}
                    onChange={e => settings.updateSettings({ baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    readOnly={settings.provider !== 'custom'}
                    className={cn(
                      settings.provider !== 'custom' && 'bg-muted text-muted-foreground'
                    )}
                  />
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            {/* SECTION 2: PREFERENCES */}
            <section>
              <h4 className="text-base font-semibold text-foreground mb-4">
                {t('settings.section_app')}
              </h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('general.language_label')}</label>
                  <Select
                    value={settings.language}
                    onValueChange={value => {
                      const lang = value === 'en' ? 'en' : 'zh'
                      settings.updateSettings({ language: lang })
                      setWorkbenchLanguage(lang)
                    }}
                  >
                    <SelectTrigger>
                      <span className="text-sm text-zinc-700 truncate">
                        {languageLabel || t('general.select_language_placeholder')}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">{t('general.language_zh')}</SelectItem>
                      <SelectItem value="en">{t('general.language_en')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">{t('data.placeholder')}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      settings.resetSettings()
                      addToast({
                        title: t('data.reset_title'),
                        description: t('data.reset_desc'),
                        type: 'info',
                      })
                    }}
                  >
                    {t('data.reset_button')}
                  </Button>
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            {/* SECTION 3: ABOUT */}
            <section className="text-center py-4">
              <div className="font-semibold">Wansan Desktop</div>
              <div className="text-xs text-muted-foreground mt-1">v0.1.0-alpha</div>
            </section>

            {/* 底部间隔器 - 确保滚动时底部内容不被截断 */}
            <div className="h-8" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
