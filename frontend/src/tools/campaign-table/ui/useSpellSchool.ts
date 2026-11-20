import { useEffect, useState } from 'react'
import { acquireSpellTraits, instanceSpellTraits } from '../model/spellSchool'
import type { SpellNodeTraits } from '../model/spellSchool'
import type { InstanceData } from '../model/table'

export function useSpellTraits(data: InstanceData, readOnly: boolean): SpellNodeTraits {
  const traits = instanceSpellTraits(data)
  const reference = data.entityType === 'spell' ? data.reference : undefined
  const needsDetail = reference?.level === undefined || reference.ritual === undefined || reference.concentration === undefined
  const entityId = !readOnly && !data.statBlock && needsDetail && reference?.source === 'encyclopedia'
    ? reference.entityId : undefined
  const [result, setResult] = useState<{ id: string; traits: SpellNodeTraits } | null>(null)
  useEffect(() => {
    if (!entityId) return
    let active = true
    const request = acquireSpellTraits(entityId)
    void request.promise.then(value => {
      if (active) setResult({ id: entityId, traits: value })
    }).catch(() => { /* Недоступный оригинал сохраняет резервную иконку. */ })
    return () => { active = false; request.release() }
  }, [entityId])
  return entityId && result?.id === entityId ? { ...result.traits, ...traits } : traits
}

export function useSpellSchool(data: InstanceData, readOnly: boolean) {
  return useSpellTraits(data, readOnly).school
}
