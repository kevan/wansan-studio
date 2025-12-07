import { useCallback } from 'react'
import { FileAsset, useFileStore } from '../stores/useFileStore'
import { useInferRelationships } from './useIPC'
import { useToastStore } from '../stores/useToastStore'
import type { RelationSuggestion } from '../../shared/types'

export function useAutoLink() {
  // Use hooks for mutations and toasts
  const inferMutation = useInferRelationships()
  const { addToast } = useToastStore()

  // We do NOT destructure state from useFileStore here for the callback dependencies.
  // Instead, we access the store directly inside the callback to ensure we always have the freshest state
  // when the async operation triggers, avoiding stale closures.
  
  const checkAutoLink = useCallback(async (currentFiles?: FileAsset[]) => {
    // 1. Get the latest state directly from the store
    const store = useFileStore.getState()
    const filesToUse = currentFiles || store.files
    const relationsToUse = store.relations
    const addRelation = store.addRelation

    console.log('checkAutoLink called. Files count:', filesToUse.length)

    // 2. Validation
    if (filesToUse.length < 2) {
      console.log('Not enough files for auto-link (Min: 2)')
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
        title: 'Analyzing Relationships',
        description: 'AI is looking for connections between your tables...',
        type: 'info',
        duration: 3000,
      })

      // 5. Call AI Service
      const suggestions = await inferMutation.mutateAsync(schemas)
      console.log('AI Suggestions:', suggestions)
      
      let addedCount = 0

      if (suggestions && Array.isArray(suggestions)) {
        suggestions.forEach((suggestion: RelationSuggestion) => {
          if (suggestion.confidence > 0.8) {
            const fileA = filesToUse.find(f => f.tableName === suggestion.sourceTable)
            const fileB = filesToUse.find(f => f.tableName === suggestion.targetTable)

            if (fileA && fileB) {
              // Check for duplicates using the FRESH relations list
              const exists = relationsToUse.some(r => 
                (r.fileAId === fileA.id && r.columnA === suggestion.sourceColumn && 
                 r.fileBId === fileB.id && r.columnB === suggestion.targetColumn) ||
                (r.fileAId === fileB.id && r.columnA === suggestion.targetColumn &&
                 r.fileBId === fileA.id && r.columnB === suggestion.sourceColumn)
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
              } else {
                console.log('Relation already exists, skipping:', suggestion)
              }
            }
          }
        })
      }

      // 6. Final Result Toast
      if (addedCount > 0) {
        addToast({
          title: 'Relationships Detected',
          description: `Automatically linked ${addedCount} table pair${addedCount > 1 ? 's' : ''}.`,
          type: 'success',
        })
      }

    } catch (error) {
      console.error('Auto-link failed:', error)
      addToast({
        title: 'Analysis Failed',
        description: 'Could not infer relationships.',
        type: 'error',
      })
    }
  }, [inferMutation, addToast]) // Dependencies are stable now

  return { checkAutoLink, isAnalyzing: inferMutation.isPending }
}