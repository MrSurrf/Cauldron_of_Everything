import { useId } from 'react'
import type { ReactNode } from 'react'

import { IconFrame, Panel, PlaceholderIcon } from '../../shared/ui'
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

export function ProfileAvatar({ profile }: { profile: ProfileData }) {
  const profileName = profile.name.trim()
  return (
    <div className={styles.avatar}>
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

export function ProfileAchievements({ profile }: { profile: ProfileData }) {
  const achievements = [
    {
      id: 'introduction',
      title: 'Знакомство состоялось',
      description: 'Указать имя и рассказать о себе.',
      earned: Boolean(profile.name.trim() && profile.bio.trim()),
    },
    {
      id: 'portrait',
      title: 'Лицо героя',
      description: 'Добавить аватар профиля.',
      earned: Boolean(profile.portrait),
    },
    {
      id: 'role',
      title: 'Место за столом',
      description: 'Выбрать роль в игре.',
      earned: Boolean(profile.role),
    },
    {
      id: 'systems',
      title: 'Игровой кругозор',
      description: 'Добавить три любимые системы.',
      earned: profile.systems.length >= 3,
    },
    {
      id: 'contacts',
      title: 'Всегда на связи',
      description: 'Добавить контакт или ссылку.',
      earned: profile.links.some(link => Boolean(link.label.trim() && link.value.trim())),
    },
  ]
  const earnedCount = achievements.filter(achievement => achievement.earned).length

  return <div className={styles.achievements}>
    <div className={styles.achievementsHeading}>
      <h3>Достижения</h3>
      <span className={styles.muted}>{earnedCount} из {achievements.length}</span>
    </div>
    <div className={styles.achievementList} role="list" aria-label="Достижения профиля">
      {achievements.map(achievement => <article className={styles.achievementCard} data-earned={achievement.earned} role="listitem" key={achievement.id}>
        <IconFrame size="3.25rem"><PlaceholderIcon /></IconFrame>
        <div>
          <h3>{achievement.title}</h3>
          <p>{achievement.description}</p>
          <span>{achievement.earned ? 'Получено' : 'Не получено'}</span>
        </div>
      </article>)}
    </div>
  </div>
}

export function TagList({ values }: { values: string[] }) {
  return <div className={styles.tags}>{values.length ? values.map(value => <span className={styles.tag} key={value}>{value}</span>) : <p className={styles.muted}>Пока не указано</p>}</div>
}
