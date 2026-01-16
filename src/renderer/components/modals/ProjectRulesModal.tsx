import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RuleEditor } from '../shared/RuleEditor'
import { useProjectStore } from '@/stores/useProjectStore'
import { BrainCircuit } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ProjectRulesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectRulesModal({ isOpen, onClose }: ProjectRulesModalProps) {
  const { t } = useTranslation(['common'])
  const {
    domainRules,
    addDomainRule,
    toggleDomainRule,
    removeDomainRule,
    updateDomainRule,
    reorderDomainRules,
  } = useProjectStore()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            {t('domain.project_title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 py-4 flex flex-col">
          <div className="mb-4 text-sm text-zinc-500 shrink-0">
            {t('domain.project_description')}
          </div>
          <div className="flex-1 min-h-0">
            <RuleEditor
              rules={domainRules || []}
              onAdd={addDomainRule}
              onToggle={toggleDomainRule}
              onRemove={removeDomainRule}
              onUpdate={updateDomainRule}
              onReorder={reorderDomainRules}
              placeholder={t('domain.placeholder')}
              emptyMessage={t('domain.project_empty')}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
