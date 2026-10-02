import { useEffect, useState } from 'react'
import { CreatureCompactCard, getCreatureById } from '../../../entities/creature'
import type { CreatureEntity } from '../../../entities/creature'
import { Button } from '../../../shared/ui'
import type { InstanceData } from '../model/table'
import styles from './CampaignTable.module.css'

/** Данные оригинала загружаются только при раскрытии; название берётся у экземпляра. */
export function NodeCreatureCard({ data }: { data: InstanceData }) {
  const reference = data.reference
  const snapshot = data.statBlock?.kind === 'creature' ? data.statBlock.entity : undefined
  const entityId = !snapshot && reference?.source === 'encyclopedia' ? reference.entityId : undefined
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ id: string; entity?: CreatureEntity; error?: string } | null>(null)
  useEffect(() => {
    if (!entityId) return
    const controller = new AbortController()
    void getCreatureById(entityId, controller.signal).then(entity => {
      if (!controller.signal.aborted) setResult({ id: entityId, ...(entity ? { entity } : { error: 'Существо больше не доступно.' }) })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ id: entityId, error: error instanceof Error ? error.message : 'Не удалось загрузить карточку.' })
    })
    return () => controller.abort()
  }, [entityId, attempt])
  const current = result?.id === entityId ? result : null
  return <div className={`${styles.nodeCreatureCard} nopan nowheel`} role="region" aria-label={`Карточка существа: ${data.title}`}>
    {entityId && !current && <p role="status">Загрузка карточки…</p>}
    {current?.error && <div role="alert"><p>{current.error}</p><Button className="nodrag nopan" size="sm" onClick={event => { event.stopPropagation(); setResult(null); setAttempt(value => value + 1) }}>Повторить</Button></div>}
    {(snapshot || current?.entity) && <CreatureCompactCard entity={{ ...(snapshot ?? current!.entity!), id: data.entityId, name: data.title }} />}
    {!entityId && !snapshot && <><h3>{data.title}</h3>{data.facts && <p>{data.facts}</p>}<p>Боевой паспорт недоступен: у существа нет ссылки на бестиарий.</p></>}
  </div>
}
