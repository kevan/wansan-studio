import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Bot,
  AlertCircle,
  Key,
  Settings2,
  Sparkles,
  Bug,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { AI_PROVIDERS, type AIProviderKey } from '@/src/lib/constants'
import { exportDebugLog } from '../../utils/debug-exporter'
import { DISCLAIMER_TEXT_ZH, DISCLAIMER_TEXT_EN } from '../../lib/legal-text'
import { SimpleMarkdown } from '@/components/ui/simple-markdown'

type VerifyStatus = 'idle' | 'loading' | 'success' | 'error'

interface SettingsDialogProps {
  trigger?: React.ReactNode
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const settings = useSettingsStore()
  const setWorkbenchLanguage = useWorkbenchStore(state => state.setLanguage)
  const addToast = useToastStore(state => state.addToast)
  const { t, i18n } = useTranslation('settings')

  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle')
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('ai')
  const [licenseCode, setLicenseCode] = useState('')

  const disclaimerText = i18n.language.startsWith('zh') ? DISCLAIMER_TEXT_ZH : DISCLAIMER_TEXT_EN

  const activeProviders = useMemo(() => {
    const remoteProviders = settings.remoteConfig?.providers
    return remoteProviders ? { ...AI_PROVIDERS, ...remoteProviders } : AI_PROVIDERS
  }, [settings.remoteConfig])

  useEffect(() => {
    const handleOpenSettings = (e: Event) => {
      setIsOpen(true)
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail === 'string') {
        setActiveTab(detail)
      } else {
        setActiveTab('ai')
      }
    }
    document.addEventListener('open-settings', handleOpenSettings)

    return () => {
      document.removeEventListener('open-settings', handleOpenSettings)
    }
  }, [])

  const providerConfig = activeProviders[settings.provider] || activeProviders['openai']
  const modelOptions = useMemo(
    () => providerConfig?.models || [],
    [providerConfig]
  )

  const providerLabel = useMemo(() => {
    const config = activeProviders[settings.provider]
    return config ? config.name : settings.provider
  }, [settings.provider, activeProviders])

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
      const response = await fetch(
        `${settings.baseUrl.replace(/\/$/, '')}/models`,
        {
          headers: {
            Authorization: `Bearer ${settings.apiKey.trim()}`,
          },
        }
      )
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-[700px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex gap-2">
                <Sparkles className="w-4 h-4" /> {t('tabs.ai')}
              </TabsTrigger>
              <TabsTrigger value="general" className="flex gap-2">
                <Settings2 className="w-4 h-4" /> {t('tabs.general')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: AI */}
          <TabsContent value="ai" className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-8">
              {/* SECTION 1: AI ENGINE */}
              <section>
                <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  {t('settings.section_ai')}
                </h4>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('ai.provider_label')}
                    </label>
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
                        {Object.entries(activeProviders).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <label className="font-medium">
                      {t('ai.api_key_label')}
                    </label>
                    <div className="relative">
                      <Input
                        type="password"
                        className={cn(
                          'px-3 font-mono transition-colors',
                          'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-900',
                          !settings.apiKey &&
                            'border-destructive focus-visible:border-destructive'
                        )}
                        value={settings.apiKey}
                        onChange={e =>
                          settings.updateSettings({ apiKey: e.target.value })
                        }
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
                    <Button
                      onClick={() => void verifyConnection()}
                      disabled={verifyStatus === 'loading'}
                      className="w-32"
                    >
                      {verifyStatus === 'loading'
                        ? t('ai.verifying')
                        : t('ai.verify_button')}
                    </Button>
                    {/* Error Text Separate */}
                    {verifyMessage && verifyStatus === 'error' && (
                      <span className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" /> {verifyMessage}
                      </span>
                    )}
                    {verifyMessage && verifyStatus === 'success' && (
                      <span className="text-sm text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> {verifyMessage}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('ai.model_label')}
                    </label>
                    {settings.provider === 'custom' ? (
                      <Input
                        value={settings.model}
                        onChange={e =>
                          settings.updateSettings({ model: e.target.value })
                        }
                        placeholder={t('ai.custom_model_placeholder')}
                      />
                    ) : (
                      <Select
                        value={settings.model}
                        onValueChange={value =>
                          settings.updateSettings({ model: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('ai.select_model_placeholder')}
                          />
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
                    <label className="text-sm font-medium">
                      {t('ai.base_url_label')}
                    </label>
                    <Input
                      value={settings.baseUrl}
                      onChange={e =>
                        settings.updateSettings({ baseUrl: e.target.value })
                      }
                      placeholder="https://api.openai.com/v1"
                      readOnly={settings.provider !== 'custom'}
                      className={cn(
                        settings.provider !== 'custom' &&
                          'bg-muted text-muted-foreground'
                      )}
                    />
                  </div>
                </div>
              </section>
              <div className="h-10" />
            </div>
          </TabsContent>

          {/* TAB: GENERAL */}
          <TabsContent
            value="general"
            className="flex-1 overflow-y-auto px-6 py-4"
          >
            <div className="space-y-6">
              {/* 1. LICENSE SECTION (NEW) */}
              <section className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <Key className="h-4 w-4 text-indigo-500" />
                  {t('license.title')}
                </h4>

                <div className="flex items-center justify-between mb-4">
                  <span
                    className={cn(
                      'text-xs font-mono font-bold px-2 py-1 rounded',
                      settings.isActivated
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {settings.isActivated
                      ? t('license.pro_active')
                      : t('license.trial_mode')}
                  </span>
                </div>

                {!settings.isActivated && (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('license.enter_code_placeholder')}
                      value={licenseCode}
                      onChange={e => setLicenseCode(e.target.value)}
                      className="bg-white"
                    />
                    <Button
                      onClick={() => {
                        if (settings.activateLicense(licenseCode)) {
                          addToast({
                            title: t('license.activated_success_title'),
                            type: 'success',
                          })
                        } else {
                          addToast({
                            title: t('license.invalid_code_title'),
                            type: 'error',
                          })
                        }
                      }}
                    >
                      {t('license.activate_button')}
                    </Button>
                  </div>
                )}
                {settings.isActivated && (
                  <p className="text-xs text-zinc-500">
                    {t('license.thanks_msg')}
                  </p>
                )}
              </section>

              <Separator />

              {/* 2. PREFERENCES (Existing Language/Reset) */}
              <section>
                <h4 className="text-base font-semibold text-foreground mb-4">
                  {t('settings.section_app')}
                </h4>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('general.language_label')}
                    </label>
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
                          {languageLabel ||
                            t('general.select_language_placeholder')}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">
                          {t('general.language_zh')}
                        </SelectItem>
                        <SelectItem value="en">
                          {t('general.language_en')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-zinc-500">
                      {t('data.placeholder')}
                    </p>
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

              <Separator />

              {/* 3. ABOUT */}
              <section className="text-center py-4">
                <div className="font-semibold text-sm">Wansan Studio</div>
                <div className="text-xs text-muted-foreground">
                  {t('about.beta_version', { version: __APP_VERSION__ })}
                </div>

                <div className="mt-2 text-[10px] text-zinc-400">
                   {t('about.disclaimer_prefix')} 
                   <span 
                     className="underline cursor-pointer hover:text-zinc-600" 
                     onClick={() => setIsDisclaimerOpen(true)}
                   >
                     {t('about.disclaimer_link')}
                   </span>.
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportDebugLog}
                  className="mt-4 gap-2"
                >
                  <Bug className="w-4 h-4" /> {t('debug_export_button')}
                </Button>
              </section>

              <div className="h-10" />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Disclaimer Dialog */}
      <Dialog open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen}>
        <DialogContent className="max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('about.disclaimer_link')}</DialogTitle>
            <DialogDescription>{t('about.disclaimer_dialog_description')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 border rounded-md bg-white">
            <SimpleMarkdown content={disclaimerText} />
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
