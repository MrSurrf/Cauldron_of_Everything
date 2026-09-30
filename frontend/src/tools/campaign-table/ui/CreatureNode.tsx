import { useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { CreatureReference, getCreatureById } from '../../../entities/creature'
import type { CreatureEntity } from '../../../entities/creature'
import type { CreatureNode as CreatureNodeType } from '../model/table'
import styles from './CampaignTable.module.css'

export function CreatureNode({ data, selected, isConnectable }: NodeProps<CreatureNodeType>) {
  const [entity, setEntity] = useState<CreatureEntity | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getCreatureById(data.creature.id, controller.signal).then(value => {
      if (!controller.signal.aborted) setEntity(value)
    }).catch(() => { /* При недоступности API узел сохраняет имя и связи; карточка справа позволяет повторить запрос. */ })
    return () => controller.abort()
  }, [data.creature.id])
  return <div className={styles.node} data-selected={selected}>
    <Handle id="in" type="target" position={Position.Left} isConnectable={isConnectable} aria-label="Входящая связь" />
    <CreatureReference entity={entity?.id === data.creature.id ? entity : { ...data.creature, entityType: 'creature', sections: [] }} />
    <Handle id="out" type="source" position={Position.Right} isConnectable={isConnectable} aria-label="Исходящая связь" />
  </div>
}
