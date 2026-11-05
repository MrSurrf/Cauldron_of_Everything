import { useEffect, useState } from 'react'
import { acquireItemClassification, instanceItemClassification } from '../model/itemClassification'
import type { InstanceData } from '../model/table'

export function useItemClassification(data: InstanceData, readOnly: boolean) {
  const classification = instanceItemClassification(data)
  const entityId = !readOnly && data.entityType === 'item' && !data.statBlock && !classification
    && data.reference?.source === 'encyclopedia' ? data.reference.entityId : undefined
  const [result, setResult] = useState<{ id: string; classification?: string } | null>(null)
  useEffect(() => {
    if (!entityId) return
    let active = true
    const request = acquireItemClassification(entityId)
    void request.promise.then(value => {
      if (active) setResult({ id: entityId, classification: value })
    }).catch(() => { /* Недоступный оригинал сохраняет резервную иконку. */ })
    return () => { active = false; request.release() }
  }, [entityId])
  return classification ?? (entityId && result?.id === entityId ? result.classification : undefined)
}
