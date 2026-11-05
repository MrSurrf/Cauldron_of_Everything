import type { CSSProperties, ReactNode } from 'react'
import { ContentPreview } from '../../../shared/ui/ContentEditor'
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

const ignoreContentChange = () => {}

function FeatureText({ value }: { value: string }) {
  return <ContentPreview value={value} readOnly onValueChange={ignoreContentChange} />
}

function Feature({ entry }: { entry: CreatureFeature }) {
  const damageValues = entry.damage?.filter((damage) => damage.formula || damage.average !== undefined)
  const hasFields = Boolean(entry.attackBonus !== undefined || entry.save || damageValues?.length || entry.range || entry.target)

  return (
    <article className={styles.entry} aria-label={entry.name}>
      <div className={styles.entryHeading}>
        <h3 className={styles.entryTitle}>{entry.name.replace(/\.$/, '')}</h3>
        {entry.usage && <span className={styles.usage}>{entry.usage}</span>}
      </div>
      {entry.subtitle && <p className={styles.subtitle}>{entry.subtitle}</p>}

      {hasFields && <dl className={styles.fields}>
        {entry.attackBonus !== undefined && <Field label="Бросок атаки">
          <CreatureRollControl label={`${entry.name} — атака`} formula={`1d20 ${formatSignedNumber(entry.attackBonus)}`}>
            <DiceIcon type="d20" />{formatSignedNumber(entry.attackBonus)}
          </CreatureRollControl>
          <small className={styles.note}>к попаданию</small>
        </Field>}
        {entry.save && <Field label="Спасбросок цели">
          <CreatureSaveControl save={entry.save} name={entry.name} />
        </Field>}
        {Boolean(damageValues?.length) && <Field label="Урон">
          <div className={styles.damageList}>
            {damageValues?.map((damage, index) => <div className={styles.damage} key={index}>
              {damage.formula ? <CreatureRollControl
                label={`${entry.name} — ${damageTypePresentation[damage.type].label.toLocaleLowerCase('ru')}`}
                formula={damage.formula}
              >
                <DamageIcon type={damage.type} />
                <DamageDiceIcon formula={damage.formula} />
                {damage.formula}
              </CreatureRollControl> : <span className={styles.fixedDamage}>
                <DamageIcon type={damage.type} />{damage.average}
              </span>}
              <small className={styles.note}>
                {damageTypePresentation[damage.type].label}
                {damage.formula && damage.average !== undefined && ` · в среднем ${damage.average}`}
              </small>
              {damage.note && <small className={styles.note}>{damage.note}</small>}
            </div>)}
          </div>
        </Field>}
        {entry.range && <Field label="Дальность / область"><span className={styles.fieldValue}>{entry.range}</span></Field>}
        {entry.target && <Field label="Цель"><span className={styles.fieldValue}>{entry.target}</span></Field>}
      </dl>}

      {entry.descriptionHtml ? <div className={styles.description}>
        <CreatureSectionContent html={entry.descriptionHtml} />
      </div> : entry.description && <div className={styles.description}><FeatureText value={entry.description} /></div>}
      {entry.effect && <div className={styles.effect}>
        <span className={styles.fieldLabel}>Эффект</span>
        <p>{entry.effect}</p>
      </div>}
      {Boolean(entry.conditions?.length) && <div className={styles.conditions}>
        <span className={styles.fieldLabel}>Состояния</span>
        <div className={styles.tags}>{entry.conditions?.map((condition) => <span className={styles.tag} key={condition}>{condition}</span>)}</div>
      </div>}
      {Boolean(entry.rolls?.length) && <div className={styles.rolls}>
        {entry.rolls?.map((roll) => <CreatureRollControl
          key={roll.label} label={`${entry.name} — ${roll.label}`}
          formula={roll.formula} successAt={roll.successAt}
        >{roll.label} · {roll.formula}</CreatureRollControl>)}
      </div>}
    </article>
  )
}

export function CreatureFeatureSections({ sections, entityId }: {
  sections: readonly CreatureSection[]
  entityId: string
}) {
  return <div className={styles.root}>
    {sections.map((section) => {
      const titleId = `${entityId}-${section.id}-title`
      return <section key={section.id} aria-labelledby={titleId}>
        <Panel padding="none" className={styles.panel}>
          <header className={styles.heading}>
            <h2 id={titleId} className={styles.sectionTitle}>{section.title}</h2>
          </header>
          <div className={styles.body}>
            {(section.introductionHtml || section.introduction) && <div className={styles.introduction}>
              {section.introductionHtml
                ? <CreatureSectionContent html={section.introductionHtml} />
                : <FeatureText value={section.introduction ?? ''} />}
            </div>}
            {section.entries !== undefined ? <div className={styles.entries}>
              {section.entries.map((entry) => <Feature key={entry.id} entry={entry} />)}
            </div> : <CreatureSectionContent html={section.html} />}
          </div>
        </Panel>
      </section>
    })}
  </div>
}
