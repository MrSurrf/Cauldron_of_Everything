import { useId } from 'react'
import type { ReactNode } from 'react'

import { Button, IconFrame, Panel, PlaceholderIcon } from '../../shared/ui'
import type { ProfileData } from './profileModel'
import styles from './ProfilePage.module.css'

export function ProfileSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const titleId = useId()
  return (
    <Panel padding="compact" className={styles.section} role="region" aria-labelledby={titleId}>
      <div className={styles.sectionHeading}>
        <h2 id={titleId}>{title}</h2>
        {action}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </Panel>
  )
}

export function ProfileAvatar({ profile, small = false }: { profile: ProfileData; small?: boolean }) {
  return (
    <div className={small ? styles.smallAvatar : styles.avatar}>
      {profile.portrait
        ? <img src={profile.portrait} alt={`Аватар ${profile.name}`} />
        : <span className={styles.avatarPlaceholder} aria-label="Аватар не выбран"><PlaceholderIcon /></span>}
    </div>
  )
}

export function ProfileStats({ profile }: { profile: ProfileData }) {
  const stats = [
    ...(profile.privacy.articles ? [['12', 'Статей']] : []),
    ...(profile.privacy.characters ? [['28', 'Чарлистов']] : []),
    ['6', 'Проведённых игр'],
    ...(profile.privacy.followers ? [['142', 'Подписчика']] : []),
  ]
  return <dl className={styles.stats}>{stats.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

export function ProfileFacts({ profile }: { profile: ProfileData }) {
  return <div className={styles.facts}>
    {profile.privacy.city && <span><PlaceholderIcon />{profile.city}</span>}
    <span><PlaceholderIcon />В игре с 2020</span>
    <span><PlaceholderIcon />{profile.role}</span>
    {profile.privacy.online && <span><i className={styles.onlineDot} />Онлайн</span>}
  </div>
}

export function ProfilePreview({ profile, onPreview }: { profile: ProfileData; onPreview?: () => void }) {
  return <ProfileSection title="Предпросмотр профиля">
    <div className={styles.previewCover} aria-hidden="true" />
    {profile.visibility === 'none'
      ? <p className={styles.muted}>Профиль виден только вам.</p>
      : <>
        <div className={styles.previewIdentity}><ProfileAvatar profile={profile} small /><div><h3>{profile.name}</h3><p>{profile.title}</p></div></div>
        <p className={styles.muted}>{profile.tagline}</p>
        <ProfileFacts profile={profile} />
        <ProfileStats profile={profile} />
        {profile.quote && <blockquote className={styles.quote}>{profile.quote}</blockquote>}
      </>}
    {onPreview && <Button fullWidth size="sm" icon={null} variant="secondary" onClick={onPreview}>Посмотреть профиль</Button>}
  </ProfileSection>
}

export function EmptyBadges({ count = 5 }: { count?: number }) {
  return <div className={styles.badgeSlots} aria-label="Места для значков">{Array.from({ length: count }, (_, i) => (
    <div key={i} className={styles.badgeSlot} aria-label={`Пустое место ${i + 1}`}><IconFrame size="3rem"><PlaceholderIcon /></IconFrame></div>
  ))}</div>
}

export function TagList({ values }: { values: string[] }) {
  return <div className={styles.tags}>{values.length ? values.map(value => <span className={styles.tag} key={value}>{value}</span>) : <p className={styles.muted}>Пока не указано</p>}</div>
}
