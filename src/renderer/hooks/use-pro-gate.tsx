import { useState, useCallback } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { ProGateModal } from '../components/modals/ProGateModal'

export function useProGate() {
  const isActivated = useSettingsStore(s => s.isActivated)
  const [gateFeature, setGateFeature] = useState<string | null>(null)

  const checkGate = useCallback(
    (featureName: string, callback: () => void) => {
      if (isActivated) {
        callback()
      } else {
        setGateFeature(featureName)
      }
    },
    [isActivated]
  )

  const gateNode = gateFeature ? (
    <ProGateModal
      isOpen={true}
      onClose={() => setGateFeature(null)}
      featureName={gateFeature}
    />
  ) : null

  return {
    gateNode,
    checkGate,
    isActivated,
  }
}
