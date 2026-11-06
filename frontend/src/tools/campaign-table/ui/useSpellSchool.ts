import { useEffect, useState } from 'react'
import { acquireSpellSchool, instanceSpellSchool } from '../model/spellSchool'
import type { InstanceData } from '../model/table'

export function useSpellSchool(data: InstanceData, readOnly: boolean) {
  const school = instanceSpellSchool(data)
  const entityId = !readOnly && data.entityType === 'spell' && !data.statBlock && !school
    && data.reference?.source === 'encyclopedia' ? data.reference.entityId : undefined
  const [result, setResult] = useState<{ id: string; school?: string } | null>(null)
  useEffect(() => {
    if (!entityId) return
    let active = true
    const request = acquireSpellSchool(entityId)
    void request.promise.then(value => {
      if (active) setResult({ id: entityId, school: value })
    }).catch(() => { /* Недоступный оригинал сохраняет резервную иконку. */ })
    return () => { active = false; request.release() }
  }, [entityId])
  return school ?? (entityId && result?.id === entityId ? result.school : undefined)
}
