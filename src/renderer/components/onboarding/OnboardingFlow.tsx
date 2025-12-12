import { useState } from 'react'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTranslation } from 'react-i18next'
import { AI_PROVIDERS, type AIProviderKey } from '@/src/lib/constants'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'

export function OnboardingFlow() {
  const settings = useSettingsStore()
  const { t } = useTranslation('settings')
  const setWorkbenchLanguage = useWorkbenchStore(state => state.setLanguage)

  const [step, setStep] = useState<'language' | 'setup' | 'finish'>('language')
  const providerConfig = AI_PROVIDERS[settings.provider]

  const setLanguageAndContinue = (lang: 'en' | 'zh') => {
    settings.updateSettings({ language: lang })
    setWorkbenchLanguage(lang)
    setStep('setup')
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-background rounded-xl shadow-xl border p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
        {step === 'language' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Languages className="h-6 w-6 text-foreground" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                Select Language / 选择语言
              </h1>
              <p className="text-sm text-muted-foreground">
                Please choose a language to continue.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setLanguageAndContinue('en')}
                className="rounded-xl border border-border bg-card hover:bg-accent transition-colors p-6 text-left"
              >
                <div className="text-lg font-semibold text-foreground">English</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Continue in English
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLanguageAndContinue('zh')}
                className="rounded-xl border border-border bg-card hover:bg-accent transition-colors p-6 text-left"
              >
                <div className="text-lg font-semibold text-foreground">简体中文</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  使用中文继续
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {t('onboarding.ai_setup_title')}
              </h2>
              <Button variant="ghost" onClick={() => setStep('language')}>
                {t('onboarding.back')}
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('ai.provider_label')}</label>
              <Select
                value={settings.provider}
                onValueChange={value => settings.setProvider(value as AIProviderKey)}
              >
                <SelectTrigger>
                  <span className="text-sm text-zinc-700 truncate">
                    {settings.provider === 'openai'
                      ? t('ai.provider_openai')
                      : settings.provider === 'deepseek'
                        ? t('ai.provider_deepseek')
                        : settings.provider === 'moonshot'
                          ? t('ai.provider_moonshot')
                          : t('ai.provider_custom')}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ai.api_key_label')}
              </label>
              <Input
                type="password"
                value={settings.apiKey}
                onChange={e => settings.updateSettings({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
              {providerConfig.getKeyUrl ? (
                <div className="text-xs text-zinc-500">
                  {t('ai.get_key_hint')}{' '}
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
                    className="text-primary hover:underline"
                  >
                    {t('ai.get_key_link')} ↗
                  </a>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ai.base_url_label')}
              </label>
              <Input
                value={settings.baseUrl}
                onChange={e => settings.updateSettings({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                readOnly={settings.provider !== 'custom'}
                className={settings.provider !== 'custom' ? 'bg-muted text-muted-foreground' : undefined}
              />
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
                    <span className="text-sm text-zinc-700 truncate">
                      {settings.model || t('ai.select_model_placeholder')}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {providerConfig.models.map(m => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {t('onboarding.hint_change_later')}
            </p>
          </div>
        )}

        {step === 'finish' && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">You are all set!</h2>
            <p className="text-muted-foreground">{t('onboarding.finish_body')}</p>
          </div>
        )}

        {step === 'setup' ? (
          <div className="flex items-center justify-end pt-2">
            <Button onClick={() => setStep('finish')}>{t('onboarding.next')}</Button>
          </div>
        ) : null}

        {step === 'finish' ? (
          <div className="flex items-center justify-end pt-2">
            <Button onClick={() => settings.completeOnboarding()}>
              {t('onboarding.start')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
