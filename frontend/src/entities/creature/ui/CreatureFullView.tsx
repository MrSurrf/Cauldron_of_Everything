import type { ReactNode } from 'react'
import typography from '../../../shared/styles/entityTypography.module.css'
import { visionTypeLabels } from '../../../shared/model'
import { Panel } from '../../../shared/ui/Panel'
import { IconButton } from '../../../shared/ui/IconButton'
import { Popover } from '../../../shared/ui/Popover'
import { RichContent } from '../../../shared/ui/RichContent'
import { PlaceholderIcon } from '../../../shared/ui/icons/PlaceholderIcon'
import { VisionIcon } from '../../../shared/ui/icons/VisionIcon'
import type { CreatureEntity, DamageAffinityState } from '../model/creature'
import {
  formatCreatureSkills,
  formatCreatureSpeeds,
  getCreatureTaxonomy,
} from './creatureFormatting'
import { CreatureAbilitiesPanel } from './CreatureAbilitiesPanel'
import { CreatureArmorClassBadge } from './CreatureArmorClassBadge'
import { CreatureHitPointsBadge } from './CreatureHitPointsBadge'
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
    <dt className={typography.subsectionLabel}>
      <span className={styles.detailIcon} aria-hidden="true"><PlaceholderIcon /></span>
      <span className={styles.detailLabelText}>
        {children}
        {accessory}
      </span>
    </dt>
  )
}

function StatBlockSection({
  id,
  title,
  accessory,
  children,
}: {
  id: string
  title: string
  accessory?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={styles.statSection} aria-labelledby={id}>
      <Panel padding="none" className={styles.statPanel}>
        <div className={styles.statHeading}>
          <span className={styles.detailIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <h2 id={id} className={typography.sectionTitle}>{title}</h2>
          {accessory}
        </div>
        <div className={styles.statBody}>{children}</div>
      </Panel>
    </section>
  )
}

function getAffinityGroup(physical: DamageAffinityState, magical: DamageAffinityState) {
  if (physical === 'normal') return magical
  if (magical === 'normal' || physical === magical) return physical
  return 'mixed'
}

export function CreatureFullView({ className, entity }: CreatureFullViewProps) {
  const taxonomy = getCreatureTaxonomy(entity)
  const descriptions = entity.sections.filter((section) => section.type === 'description')
  const sections = entity.sections.filter((section) => section.type !== 'description')
  const hasSidebar = descriptions.length > 0 || Boolean(entity.habitat?.length)
  const damageGroups = [
    { key: 'resistance', title: 'Сопротивления к урону', notes: entity.damageResistances },
    { key: 'immunity', title: 'Иммунитеты к урону', notes: entity.damageImmunities },
    { key: 'vulnerability', title: 'Уязвимости', notes: entity.damageVulnerabilities },
    { key: 'mixed', title: 'Смешанные особенности', notes: undefined },
  ].map((group) => ({
    ...group,
    affinities: entity.damageAffinities?.filter(
      ({ physical, magical }) => getAffinityGroup(physical, magical) === group.key,
    ) ?? [],
  })).filter((group) => group.affinities.length > 0 || group.notes?.length)
  const details = [
    { label: 'Навыки', value: formatCreatureSkills(entity.skills) },
    {
      label: 'Иммунитеты к состояниям',
      value: entity.conditionImmunities?.length ? (
        <span className={styles.conditionList}>
          {entity.conditionImmunities.map((condition) => (
            <span className={styles.condition} key={condition}>{condition}</span>
          ))}
        </span>
      ) : undefined,
    },
    { label: 'Языки', value: entity.languages?.join(', ') },
  ].filter((detail) => detail.value)
  const speeds = formatCreatureSpeeds(entity.speed)
  const hasSenses = Boolean(entity.vision?.length || entity.senses?.length || entity.passivePerception != null)
  const hasVitals = Boolean(entity.armorClass || entity.hitPoints)
  const challenge = entity.challengeRating?.match(/^\s*([^()]+?)\s*(?:\((.*)\))?\s*$/)

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
        <div className={styles.headerContent}>
          <div className={styles.identity}>
            <h1 id={`${entity.id}-title`} className={styles.title}>{entity.name}</h1>
            {entity.nameEn && <p className={styles.englishName}>{entity.nameEn}</p>}
            {taxonomy && <p className={styles.taxonomy}>{taxonomy}</p>}
          </div>
          {(entity.challengeRating || entity.proficiencyBonus) && (
            <dl className={styles.combatMeta}>
              {entity.challengeRating && (
                <div>
                  <dt className={typography.secondaryLabel}>Опасность</dt>
                  <dd>
                    <strong>{challenge?.[1]?.trim() ?? entity.challengeRating}</strong>
                    {challenge?.[2] && <small>({challenge[2]})</small>}
                  </dd>
                </div>
              )}
              {entity.proficiencyBonus && (
                <div>
                  <dt className={typography.secondaryLabel}>Бонус мастерства</dt>
                  <dd><strong>{entity.proficiencyBonus}</strong></dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </header>

      <div className={styles.main}>
        {(hasVitals || speeds.length > 0 || hasSenses) && (
          <StatBlockSection id={`${entity.id}-passport-title`} title="Боевой паспорт">
            <div className={styles.passport} data-has-vitals={hasVitals}>
              {hasVitals && (
                <dl className={styles.vitals}>
                  {entity.armorClass && (
                    <div className={`${styles.armorClassVital} ${styles.armorAlignment}`}>
                      <dt className={styles.srOnly}>Класс доспеха</dt>
                      <dd><CreatureArmorClassBadge armorClass={entity.armorClass} /></dd>
                    </div>
                  )}
                  {entity.hitPoints && (
                    <div className={styles.armorClassVital}>
                      <dt className={styles.srOnly}>Хиты</dt>
                      <dd>
                        <CreatureHitPointsBadge creatureType={entity.creatureType} hitPoints={entity.hitPoints} />
                      </dd>
                    </div>
                  )}
                </dl>
              )}
              {(speeds.length > 0 || hasSenses) && (
                <dl className={styles.mobility}>
                  {speeds.length > 0 && (
                    <div>
                      <DetailLabel>Скорость</DetailLabel>
                      <dd className={styles.speedList}>
                        {speeds.map((speed, index) => (
                          <span className={styles.speed} key={index}>
                            <strong>{speed.value}</strong>
                            {speed.label && <small>{speed.label}</small>}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {hasSenses && (
                    <div>
                      <DetailLabel>Чувства</DetailLabel>
                      <dd className={styles.sensesList}>
                        {entity.vision?.map((sense) => (
                          <span className={styles.visionSense} key={`${sense.type}-${sense.range ?? 'unlimited'}`}>
                            <VisionIcon type={sense.type} />
                            <span>
                              <span>{visionTypeLabels[sense.type]}</span>
                              {sense.range != null && <strong>{sense.range} фт.</strong>}
                            </span>
                          </span>
                        ))}
                        {entity.senses?.map((sense) => (
                          <span className={styles.senseNote} key={sense}>{sense}</span>
                        ))}
                        {entity.passivePerception != null && (
                          <span className={styles.passivePerception}>
                            <VisionIcon type="normal" />
                            <span>Пассивная внимательность</span>
                            <strong>{entity.passivePerception}</strong>
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </StatBlockSection>
        )}

        {damageGroups.length > 0 && (
          <StatBlockSection
            id={`${entity.id}-damage-affinities-title`}
            title="Сопротивления, иммунитеты и уязвимости"
            accessory={
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
            }
          >
            <div className={styles.damageGroups}>
              {damageGroups.map((group) => (
                <section className={styles.damageGroup} key={group.key} aria-labelledby={`${entity.id}-damage-${group.key}`}>
                  <h3 id={`${entity.id}-damage-${group.key}`} className={typography.subsectionLabel}>{group.title}</h3>
                  <div className={styles.damageAffinities}>
                    {group.affinities.map((affinity) => (
                      <DamageAffinityBadge
                        key={affinity.damageType}
                        className={styles.compactDamageBadge}
                        damageType={affinity.damageType}
                        physicalState={affinity.physical}
                        magicalState={affinity.magical}
                      />
                    ))}
                  </div>
                  {group.notes?.map((note) => <p className={styles.damageNote} key={note}>{note}</p>)}
                </section>
              ))}
            </div>
          </StatBlockSection>
        )}

        {entity.abilities && (
          <StatBlockSection id={`${entity.id}-abilities-title`} title="Характеристики">
            <CreatureAbilitiesPanel abilities={entity.abilities} savingThrows={entity.savingThrows} />
          </StatBlockSection>
        )}

        {details.length > 0 && (
          <StatBlockSection id={`${entity.id}-information-title`} title="Основная информация">
            <dl className={styles.details}>
              {details.map((detail) => (
                <div key={detail.label}>
                  <DetailLabel>{detail.label}</DetailLabel>
                  <dd className={typography.bodyText}>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </StatBlockSection>
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
                    <dd className={typography.bodyText}>{entity.habitat?.join(', ')}</dd>
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
