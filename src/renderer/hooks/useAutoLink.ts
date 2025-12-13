import { useCallback } from 'react'
import { FileAsset, useFileStore } from '../stores/useFileStore'
import { useContextAnalysis } from './useIPC'
import { useToastStore } from '../stores/useToastStore'
import type { RelationSuggestion } from '../../shared/types'
import { useWorkbenchStore } from '../stores/useWorkbenchStore'
import { useTranslation } from 'react-i18next' // Import useTranslation

export function useAutoLink() {
  // Use hooks for mutations and toasts
  const analysisMutation = useContextAnalysis()
  const { addToast } = useToastStore()
  const { language: currentLanguage } = useWorkbenchStore.getState()
  const { t } = useTranslation('chat') // Initialize useTranslation

  // We do NOT destructure state from useFileStore here for the callback dependencies.
  // Instead, we access the store directly inside the callback to ensure we always have the freshest state
  // when the async operation triggers, avoiding stale closures.

  const checkAutoLink = useCallback(
    async (currentFiles?: FileAsset[]) => {
      // 0. Check for API Key before proceeding with AI calls
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

      // 1. Get the latest state directly from the store
      const store = useFileStore.getState()
      const filesToUse = currentFiles || store.files
      const relationsToUse = store.relations
      const addRelation = store.addRelation
      const setSuggestedPrompts = store.setSuggestedPrompts
      const language = currentLanguage || 'en' // Use currentLanguage or default to 'en'

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
          type: c.type,
          sampleValues: c.sampleValues,
        })),
      }))

      try {
        // 4. Notify User
        addToast({
          title: 'Analyzing Data Context',
          description: 'AI is analyzing your data structure and relationships...',
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
        if (relationships && Array.isArray(relationships) && filesToUse.length > 1) {
          relationships.forEach((suggestion: RelationSuggestion) => {
            if (suggestion.confidence > 0.8) {
              const fileA = filesToUse.find(
                f => f.tableName === suggestion.sourceTable
              )
              const fileB = filesToUse.find(
                f => f.tableName === suggestion.targetTable
              )

              if (fileA && fileB) {
                // Check for duplicates using the FRESH relations list
                const exists = relationsToUse.some(
                  r =>
                    (r.fileAId === fileA.id &&
                      r.columnA === suggestion.sourceColumn &&
                      r.fileBId === fileB.id &&
                      r.columnB === suggestion.targetColumn) ||
                    (r.fileAId === fileB.id &&
                      r.columnA === suggestion.targetColumn &&
                      r.fileBId === fileA.id &&
                      r.columnB === suggestion.sourceColumn)
                )

                if (!exists) {
                  console.log('Adding relation:', suggestion)
                  addRelation({
                    fileAId: fileA.id,
                    columnA: suggestion.sourceColumn,
                    fileBId: fileB.id,
                    columnB: suggestion.targetColumn,
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
          ? 'Generated starter prompts.'
          : ''
        const relationMsg =
          addedCount > 0
            ? `Linked ${addedCount} table pair${addedCount > 1 ? 's' : ''}.`
            : ''

        addToast({
          title: 'Analysis Complete',
          description: `${promptMsg} ${relationMsg}`.trim() || 'Analysis finished.',
          type: 'success',
        })
      } catch (error) {
        console.error('Auto-link failed:', error)
        addToast({
          title: 'Analysis Failed',
          description: 'Could not analyze data context.',
          type: 'error',
        })
      }
    },
    [analysisMutation, addToast]
  ) // Dependencies are stable now

  return { checkAutoLink, isAnalyzing: analysisMutation.isPending }
}
