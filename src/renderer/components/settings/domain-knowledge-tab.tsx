import { useSettingsStore } from '@/stores/useSettingsStore'
import { BrainCircuit } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RuleEditor } from '../shared/RuleEditor'

export function DomainKnowledgeTab() {
  const { t } = useTranslation('common')
  const {
    domainRules,
    addDomainRule,
    toggleDomainRule,
    removeDomainRule,
    updateDomainRule,
    reorderDomainRules,
  } = useSettingsStore()

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden min-h-0">
      {/* Header */}
      <div className="shrink-0">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-500" />
          {t('domain.title')}
        </h3>
        <p className="text-sm text-zinc-500 mt-1">{t('domain.description')}</p>
      </div>

      <div className="flex-1 min-h-0">
        <RuleEditor
          rules={domainRules}
          onAdd={addDomainRule}
          onToggle={toggleDomainRule}
          onRemove={removeDomainRule}
          onUpdate={updateDomainRule}
          onReorder={reorderDomainRules}
          scope="global"
        />
      </div>
    </div>
  )
}
