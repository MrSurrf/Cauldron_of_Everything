import type { CreatureEntity } from '../model/creature'
import styles from './CreatureInformation.module.css'

/** Дополнительные сведения сохраняют свои группы, не превращаясь в таблицу. */
export function CreatureInformation({ entity }: { entity: CreatureEntity }) {
  const skills = Object.entries(entity.skills ?? {})
  return <dl className={styles.groups}>
    {skills.length > 0 && <div className={styles.group}>
      <dt>Навыки</dt>
      <dd className={styles.values}>{skills.map(([name, value]) => <span className={styles.skill} key={name}>
        <span>{name}</span><strong>{value}</strong>
      </span>)}</dd>
    </div>}
    {Boolean(entity.conditionImmunities?.length) && <div className={styles.group}>
      <dt>Иммунитеты к состояниям</dt>
      <dd className={styles.values}>{entity.conditionImmunities!.map(condition => <span className={styles.condition} key={condition}>{condition}</span>)}</dd>
    </div>}
    {Boolean(entity.languages?.length) && <div className={styles.group}>
      <dt>Языки</dt>
      <dd className={styles.languages}>{entity.languages!.map(language => <span key={language}>{language}</span>)}</dd>
    </div>}
  </dl>
}
