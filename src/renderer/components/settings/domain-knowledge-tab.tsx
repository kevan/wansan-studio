import { useState } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Trash2,
  CheckCircle2,
  Circle,
  Plus,
  BrainCircuit,
  Lightbulb,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

export function DomainKnowledgeTab() {
  const { t } = useTranslation('settings')
  const {
    domainRules,
    addDomainRule,
    toggleDomainRule,
    removeDomainRule,
    updateDomainRule,
  } = useSettingsStore()
  const [newRule, setNewRule] = useState('')

  const handleAdd = () => {
    if (!newRule.trim()) return
    addDomainRule(newRule.trim())
    setNewRule('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-500" />
          {t('domain.title')}
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          {t('domain.description')}
        </p>
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <Input
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('domain.placeholder')}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={!newRule.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          {t('domain.add')}
        </Button>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] border rounded-lg p-4 bg-zinc-50/50">
        {domainRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
            <Lightbulb className="w-8 h-8 opacity-50" />
            <p className="text-sm">
              {t('domain.empty')}
            </p>
          </div>
        ) : (
          domainRules.map(rule => (
            <div
              key={rule.id}
              className={cn(
                'group flex items-center gap-3 p-3 rounded-lg border transition-all',
                rule.isEnabled
                  ? 'bg-white border-zinc-200 shadow-sm'
                  : 'bg-zinc-50 border-transparent opacity-60'
              )}
            >
              <button
                onClick={() => toggleDomainRule(rule.id)}
                className={cn(
                  'shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors',
                  rule.isEnabled
                    ? 'text-indigo-600'
                    : 'text-zinc-300 hover:text-zinc-400'
                )}
              >
                {rule.isEnabled ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <input
                  className={cn(
                    'w-full bg-transparent border-none focus:outline-none text-sm',
                    rule.isEnabled
                      ? 'text-zinc-900 font-medium'
                      : 'text-zinc-500 line-through decoration-zinc-300'
                  )}
                  value={rule.content}
                  onChange={e => updateDomainRule(rule.id, e.target.value)}
                />
              </div>

              <button
                onClick={() => removeDomainRule(rule.id)}
                className="shrink-0 p-1.5 rounded-md text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
