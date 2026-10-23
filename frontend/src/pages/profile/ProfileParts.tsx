import { useId } from 'react'
import type { ReactNode } from 'react'

import { Panel, PlaceholderIcon } from '../../shared/ui'
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
  const profileName = profile.name.trim()
  return (
    <div className={small ? styles.smallAvatar : styles.avatar}>
      {profile.portrait
        ? <img src={profile.portrait} alt={profileName ? `Аватар ${profileName}` : 'Аватар профиля'} />
        : <span className={styles.avatarPlaceholder} aria-label="Аватар не выбран"><PlaceholderIcon /></span>}
    </div>
  )
}

export function ProfileFacts({ profile }: { profile: ProfileData }) {
  return <div className={styles.facts}>
    {profile.privacy.city && profile.city && <span><PlaceholderIcon />{profile.city}</span>}
    {profile.role && <span><PlaceholderIcon />{profile.role}</span>}
    {profile.privacy.online && <span><i className={styles.onlineDot} />Онлайн</span>}
  </div>
}

export function ProfilePreview({ profile }: { profile: ProfileData }) {
  const visibilityNote = profile.visibility === 'friends'
    ? 'Этот профиль видят только друзья.'
    : profile.visibility === 'none'
      ? 'Этот профиль виден только вам.'
      : 'Так профиль выглядит для других пользователей.'

  return <ProfileSection title="Предпросмотр профиля">
    <div className={styles.previewCover} aria-hidden="true" />
    <p className={styles.muted}>{visibilityNote}</p>
    {profile.visibility === 'none'
      ? null
      : <>
        <div className={styles.previewIdentity}><ProfileAvatar profile={profile} small /><div><h3>{profile.name || 'Имя не указано'}</h3>{profile.title && <p>{profile.title}</p>}</div></div>
        {profile.tagline && <p className={styles.muted}>{profile.tagline}</p>}
        <ProfileFacts profile={profile} />
        {profile.quote && <blockquote className={styles.quote}>{profile.quote}</blockquote>}
      </>}
  </ProfileSection>
}

export function TagList({ values }: { values: string[] }) {
  return <div className={styles.tags}>{values.length ? values.map(value => <span className={styles.tag} key={value}>{value}</span>) : <p className={styles.muted}>Пока не указано</p>}</div>
}
