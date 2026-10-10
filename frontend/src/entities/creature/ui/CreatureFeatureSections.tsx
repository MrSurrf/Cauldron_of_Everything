import type { CSSProperties, ReactNode } from 'react'
import { Panel } from '../../../shared/ui/Panel'
import { DiceIcon } from '../../../shared/ui/icons/DiceIcon'
import { getDiceTypeFromExpression } from '../../../shared/ui/icons/dice'
import type { CreatureFeature, CreatureSection, DamageType } from '../model/creature'
import { damageTypePresentation } from './DamageAffinityBadge/damageTypePresentation'
import { CreatureRollControl, CreatureSaveControl } from './CreatureRollControl'
import { CreatureSectionContent } from './CreatureSectionContent'
import { formatSignedNumber } from './creatureFormatting'
import styles from './CreatureFeatureSections.module.css'

function DamageIcon({ type }: { type: DamageType }) {
  const presentation = damageTypePresentation[type]
  return <span aria-hidden="true" data-damage-icon={type} className={styles.damageIcon} style={{
    '--damage-icon': `url("${presentation.icon}")`,
    color: presentation.color,
    transform: `rotate(${presentation.rotation ?? 0}deg) scale(${presentation.flipX ? -presentation.scale : presentation.scale}, ${presentation.scale})`,
  } as CSSProperties} />
}

function DamageDiceIcon({ formula }: { formula: string }) {
  const die = getDiceTypeFromExpression(formula.replace(/[кК]/g, 'd'))
  return die ? <DiceIcon type={die} /> : null
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className={styles.field}><dt className={styles.fieldLabel}>{label}</dt><dd>{children}</dd></div>
}

function Feature({ entry, rows }: { entry: CreatureFeature; rows: boolean }) {
  const hasFields = entry.attackBonus !== undefined || entry.save || entry.damage?.length || entry.range || entry.target || entry.effect
  return (
    <article className={rows ? styles.action : styles.card} aria-label={entry.name}>
      <div className={styles.identity}>
        <div className={styles.entryHeading}>
          <h3 className={styles.entryTitle}>{entry.name}</h3>
          {entry.usage && <span className={styles.tag}>{entry.usage}</span>}
        </div>
        {entry.subtitle && <p className={styles.subtitle}>{entry.subtitle}</p>}
        <p className={styles.description}>{entry.description}</p>
        {entry.rolls?.map((roll) => <CreatureRollControl
          key={roll.label} label={`${entry.name} — ${roll.label}`}
          formula={roll.formula} successAt={roll.successAt}
        >{roll.label} · {roll.formula}</CreatureRollControl>)}
      </div>
      {hasFields && <dl className={styles.fields}>
        <Field label={entry.attackBonus !== undefined ? 'Бросок атаки' : 'Спасбросок'}>
          {entry.attackBonus !== undefined ? <>
            <CreatureRollControl label={`${entry.name} — атака`} formula={`1d20 ${formatSignedNumber(entry.attackBonus)}`}>
              <DiceIcon type="d20" />{formatSignedNumber(entry.attackBonus)}
            </CreatureRollControl>
            <small className={styles.note}>к попаданию</small>
          </> : entry.save ? <CreatureSaveControl save={entry.save} name={entry.name} /> : <span className={styles.note}>—</span>}
        </Field>
        <Field label="Урон">
          {entry.damage?.length ? entry.damage.map((damage, index) => <div className={styles.damage} key={index}>
            <CreatureRollControl label={`${entry.name} — ${damageTypePresentation[damage.type].label.toLocaleLowerCase('ru')}`} formula={damage.formula}>
              <DamageIcon type={damage.type} />
              <DamageDiceIcon formula={damage.formula} />
              {damage.formula}
            </CreatureRollControl>
            <small className={styles.note}>{damageTypePresentation[damage.type].label}{damage.average !== undefined && ` (${damage.average})`}</small>
            {damage.note && <small className={styles.note}>{damage.note}</small>}
          </div>) : <span className={styles.note}>—</span>}
        </Field>
        <Field label="Дальность / область"><span className={styles.fieldValue}>{entry.range ?? '—'}</span></Field>
        <Field label="Цель"><span>{entry.target ?? '—'}</span></Field>
        <Field label="Доп. эффект">
          {entry.effect && <p>{entry.effect}</p>}
          {entry.attackBonus !== undefined && entry.save && <CreatureSaveControl save={entry.save} name={entry.name} />}
          {entry.conditions?.length ? <div className={styles.tags}>{entry.conditions.map((condition) => <span className={styles.tag} key={condition}>{condition}</span>)}</div> : !entry.effect && !entry.save && <span className={styles.note}>—</span>}
        </Field>
      </dl>}
    </article>
  )
}

export function CreatureFeatureSections({ sections, entityId }: {
  sections: readonly CreatureSection[]
  entityId: string
}) {
  return <div className={styles.root}>
    {sections.map((section) => {
      const rows = ['actions', 'bonus-actions', 'reactions'].includes(section.type)
      const titleId = `${entityId}-${section.id}-title`
      return <section key={section.id} aria-labelledby={titleId}>
        <Panel padding="none" className={styles.panel}>
          <header className={styles.heading}>
            <h2 id={titleId} className={styles.sectionTitle}>{section.title}</h2>
            {section.introduction && <p>{section.introduction}</p>}
          </header>
          <div className={styles.body}>
            {section.entries?.length ? <div className={rows ? styles.actions : styles.cards}>
              {section.entries.map((entry) => <Feature key={entry.id} entry={entry} rows={rows} />)}
            </div> : <CreatureSectionContent html={section.html} />}
          </div>
        </Panel>
      </section>
    })}
  </div>
}
