import { useCallback } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useContextAnalysis } from './useIPC'
import { useToastStore } from '../stores/useToastStore'
import type { RelationSuggestion, FileNode } from '../../shared/types'
import { useWorkbenchStore } from '../stores/useWorkbenchStore'
import { useTranslation } from 'react-i18next'

export function useAutoLink() {
  const analysisMutation = useContextAnalysis()
  const { addToast } = useToastStore()
  const { language: currentLanguage } = useWorkbenchStore.getState()
  const { t } = useTranslation('chat')

  const checkAutoLink = useCallback(
    async (currentFiles?: FileNode[]) => {
      let apiKey: string | undefined
      try {
        const configRes = await window.electronAPI.getAIConfig()
        if (configRes.success && configRes.data) {
          apiKey = configRes.data.apiKey
        }
      } catch (e) {
        console.error('Failed to check AI config for auto-link', e)
      }

      if (!apiKey) {
        addToast({
          title: t('auto_link_analysis_failed_title'),
          description: t('auto_link_missing_api_key_desc'),
          type: 'error',
          duration: 10000,
        })
        return
      }

      const store = useProjectStore.getState()
      const filesToUse = currentFiles || store.files
      const addRelation = store.addRelation
      const setSuggestedPrompts = store.setSuggestedPrompts
      const language = currentLanguage || 'en' // Use currentLanguage or default to 'en'

      // Aggregate all current relations for duplicate check
      const relationsToUse = filesToUse.flatMap(f =>
        (f.relations || []).map(r => ({
          sourceFileId: f.id,
          sourceColumn: r.sourceColumn,
          targetFileId: r.targetFileId,
          targetColumn: r.targetColumn,
        }))
      )

      console.log('checkAutoLink called. Files count:', filesToUse.length)

      // 2. Validation
      if (filesToUse.length === 0) {
        console.log('No files to analyze')
        return
      }

      // 3. Prepare Schemas
      const schemas = filesToUse.map(f => ({
        tableName: f.tableName,
        description: f.name,
        columns: f.columns.map(c => ({
          name: c.name,
          safeName: c.safeName,
          type: c.type,
          sampleValues: c.sampleValues,
        })),
      }))

      try {
        // 4. Notify User
        addToast({
          title: t('auto_link_analyzing_title'),
          description: t('auto_link_analyzing_desc'),
          type: 'info',
          duration: 3000,
        })

        // 5. Call AI Service
        const result = await analysisMutation.mutateAsync({
          schemas,
          language,
        })
        console.log('AI Analysis Result:', result)

        const { relationships, suggestedPrompts } = result

        // Update Prompts
        if (suggestedPrompts && suggestedPrompts.length > 0) {
          setSuggestedPrompts(suggestedPrompts)
        }

        // Process Relationships (only if we have multiple files)
        let addedCount = 0
        if (
          relationships &&
          Array.isArray(relationships) &&
          filesToUse.length > 1
        ) {
          relationships.forEach((suggestion: RelationSuggestion) => {
            if (suggestion.confidence > 0.8) {
              const fileA = filesToUse.find(
                f => f.tableName === suggestion.sourceTable
              )
              const fileB = filesToUse.find(
                f => f.tableName === suggestion.targetTable
              )

              if (fileA && fileB) {
                // Check for duplicates
                const exists = relationsToUse.some(
                  r =>
                    (r.sourceFileId === fileA.id &&
                      r.sourceColumn === suggestion.sourceColumn &&
                      r.targetFileId === fileB.id &&
                      r.targetColumn === suggestion.targetColumn) ||
                    (r.sourceFileId === fileB.id &&
                      r.sourceColumn === suggestion.targetColumn &&
                      r.targetFileId === fileA.id &&
                      r.targetColumn === suggestion.sourceColumn)
                )

                if (!exists) {
                  console.log('Adding relation:', suggestion)
                  addRelation({
                    sourceFileId: fileA.id,
                    sourceColumn: suggestion.sourceColumn,
                    targetFileId: fileB.id,
                    targetColumn: suggestion.targetColumn,
                    autoDetected: true,
                  })
                  addedCount++
                }
              }
            }
          })
        }

        // 6. Final Result Toast
        const promptMsg = suggestedPrompts?.length
          ? t('auto_link_complete_prompts')
          : ''
        const relationMsg =
          addedCount > 0
            ? t('auto_link_complete_relations', { count: addedCount })
            : ''

        addToast({
          title: t('auto_link_complete_title'),
          description: t('auto_link_complete_desc', {
            prompts: promptMsg,
            relations: relationMsg,
          }),
          type: 'success',
        })
      } catch (error) {
        console.error('Auto-link failed:', error)
        addToast({
          title: t('auto_link_error_title'),
          description: t('auto_link_error_desc'),
          type: 'error',
        })
      }
    },
    [analysisMutation, addToast]
  ) // Dependencies are stable now

  return { checkAutoLink, isAnalyzing: analysisMutation.isPending }
}
