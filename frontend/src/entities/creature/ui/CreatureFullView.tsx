import type { ReactNode } from 'react'
import { formatVisionSense } from '../../../shared/model'
import { Panel } from '../../../shared/ui/Panel'
import { IconButton } from '../../../shared/ui/IconButton'
import { Popover } from '../../../shared/ui/Popover'
import { RichContent } from '../../../shared/ui/RichContent'
import { PlaceholderIcon } from '../../../shared/ui/icons/PlaceholderIcon'
import { VisionIcon } from '../../../shared/ui/icons/VisionIcon'
import type { CreatureEntity } from '../model/creature'
import {
  formatCreatureSkills,
  getCreatureTaxonomy,
} from './creatureFormatting'
import { CreatureAbilitiesPanel } from './CreatureAbilitiesPanel'
import { CreatureArmorClassBadge } from './CreatureArmorClassBadge'
import { DamageAffinityBadge, DamageAffinityLegend } from './DamageAffinityBadge'
import { CreatureSectionContent } from './CreatureSectionContent'
import styles from './CreatureFullView.module.css'

export type CreatureFullViewProps = {
  className?: string
  entity: CreatureEntity
}

function DetailLabel({
  accessory,
  children,
}: {
  accessory?: ReactNode
  children: ReactNode
}) {
  return (
    <dt>
      <span className={styles.detailIcon} aria-hidden="true"><PlaceholderIcon /></span>
      <span className={styles.detailLabelText}>
        {children}
        {accessory}
      </span>
    </dt>
  )
}

export function CreatureFullView({ className, entity }: CreatureFullViewProps) {
  const taxonomy = getCreatureTaxonomy(entity)
  const descriptions = entity.sections.filter((section) => section.type === 'description')
  const sections = entity.sections.filter((section) => section.type !== 'description')
  const hasSidebar = descriptions.length > 0 || Boolean(entity.habitat?.length)
  const hasDamageAffinities = Boolean(entity.damageAffinities?.length)
  const checks = [
    { label: 'Навыки', value: formatCreatureSkills(entity.skills) },
  ].filter((detail) => detail.value)
  const details = [
    { label: 'Уязвимости к урону', value: entity.damageVulnerabilities?.join(', ') },
    { label: 'Сопротивления урону', value: entity.damageResistances?.join(', ') },
    { label: 'Иммунитеты к урону', value: entity.damageImmunities?.join(', ') },
    { label: 'Иммунитеты к состояниям', value: entity.conditionImmunities?.join(', ') },
    { label: 'Языки', value: entity.languages?.join(', ') },
    { label: 'Опасность', value: entity.challengeRating },
    { label: 'Бонус мастерства', value: entity.proficiencyBonus },
  ].filter((detail) => detail.value)
  const vitals = [
    { label: 'Хиты', value: entity.hitPoints },
    { label: 'Скорость', value: entity.speed },
  ].filter((vital) => vital.value)

  return (
    <article
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-labelledby={`${entity.id}-title`}
      data-has-sidebar={hasSidebar}
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          <span className={styles.detailIcon} aria-hidden="true"><PlaceholderIcon /></span>
          Энциклопедия · Бестиарий
        </p>
        <h1 id={`${entity.id}-title`} className={styles.title}>{entity.name}</h1>
        {entity.nameEn && <p className={styles.englishName}>{entity.nameEn}</p>}
        {taxonomy && <p className={styles.taxonomy}>{taxonomy}</p>}
      </header>

      <div className={styles.main}>
        {(entity.armorClass || vitals.length > 0) && (
          <dl className={styles.vitals}>
            {entity.armorClass && (
              <div className={styles.armorClassVital}>
                <dt className={styles.srOnly}>Класс доспеха</dt>
                <dd>
                  <CreatureArmorClassBadge armorClass={entity.armorClass} />
                </dd>
              </div>
            )}
            {vitals.map((vital) => (
              <div key={vital.label}>
                <span className={styles.vitalIcon} aria-hidden="true"><PlaceholderIcon /></span>
                <dt>{vital.label}</dt>
                <dd>{vital.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {hasDamageAffinities && (
          <section
            className={styles.damageStrip}
            aria-labelledby={`${entity.id}-damage-affinities-title`}
          >
            <div className={styles.damageStripHeading}>
              <h2 id={`${entity.id}-damage-affinities-title`}>
                Сопротивления и уязвимости
              </h2>
              <Popover
                aria-label="Пояснение обозначений урона"
                className={styles.affinityPopover}
                content={<DamageAffinityLegend />}
                placement="right"
              >
                <IconButton
                  aria-label="Как читать сопротивления и уязвимости"
                  className={styles.affinityHelpButton}
                  decoration="bare"
                  icon={<span className={styles.affinityHelpGlyph}>?</span>}
                  size="sm"
                  variant="secondary"
                />
              </Popover>
            </div>
            <div className={styles.damageAffinities}>
              {entity.damageAffinities?.map((affinity) => (
                <DamageAffinityBadge
                  key={affinity.damageType}
                  className={styles.compactDamageBadge}
                  damageType={affinity.damageType}
                  physicalState={affinity.physical}
                  magicalState={affinity.magical}
                />
              ))}
            </div>
          </section>
        )}

        {entity.abilities && (
          <CreatureAbilitiesPanel
            abilities={entity.abilities}
            savingThrows={entity.savingThrows}
          />
        )}

        {(checks.length > 0 || details.length > 0 || Boolean(entity.vision?.length) || Boolean(entity.senses?.length)) && (
          <dl className={styles.details}>
            {checks.map((detail) => (
              <div key={detail.label}>
                <DetailLabel>{detail.label}</DetailLabel>
                <dd>{detail.value}</dd>
              </div>
            ))}
            {(Boolean(entity.vision?.length) || Boolean(entity.senses?.length)) && (
              <div>
                <DetailLabel>Чувства</DetailLabel>
                <dd className={styles.sensesList}>
                  {entity.vision?.map((sense) => (
                    <span className={styles.visionSense} key={`${sense.type}-${sense.range ?? 'unlimited'}`}>
                      <VisionIcon type={sense.type} />
                      {formatVisionSense(sense)}
                    </span>
                  ))}
                  {entity.senses?.map((sense) => (
                    <span key={sense}>{sense}</span>
                  ))}
                </dd>
              </div>
            )}
            {details.map((detail) => (
              <div key={detail.label}>
                <DetailLabel>{detail.label}</DetailLabel>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className={styles.sections}>
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`${entity.id}-${section.id}-title`}>
              <h2 id={`${entity.id}-${section.id}-title`} className={styles.sectionTitle}>
                {section.title}
              </h2>
              <CreatureSectionContent html={section.html} />
            </section>
          ))}
        </div>
      </div>

      {hasSidebar && (
        <aside className={styles.sidebar} aria-label="Описание существа">
          <Panel className={styles.descriptionPanel} padding="none">
            <div className={styles.descriptionBody}>
              {descriptions.map((section) => (
                <section key={section.id} aria-labelledby={`${entity.id}-${section.id}-title`}>
                  <h2 id={`${entity.id}-${section.id}-title`} className={styles.sectionTitle}>
                    {section.title}
                  </h2>
                  <RichContent html={section.html} />
                </section>
              ))}
              {Boolean(entity.habitat?.length) && (
                <dl className={styles.habitat}>
                  <div>
                    <DetailLabel>Среда обитания</DetailLabel>
                    <dd>{entity.habitat?.join(', ')}</dd>
                  </div>
                </dl>
              )}
            </div>
          </Panel>
        </aside>
      )}
    </article>
  )
}
