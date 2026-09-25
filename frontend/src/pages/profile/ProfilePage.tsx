import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

import { Button, Checkbox, Combobox, EditIcon, IconFrame, Panel, PlaceholderIcon, TextArea, TextInput } from '../../shared/ui'
import { CharacterPortrait } from '../../tools/character-sheet'
import { EmptyBadges, ProfileAvatar, ProfileFacts, ProfilePreview, ProfileSection, ProfileStats, TagList } from './ProfileParts'
import { activityFilters, activityItems, gameSystems, genres, initialProfile, playStyles, privacyFields, profileTabs, themes, visibilityOptions } from './profileModel'
import type { ProfileData, ProfileTab } from './profileModel'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>('about')
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState<ProfileData>(initialProfile)
  const [draft, setDraft] = useState<ProfileData>(initialProfile)
  const [filter, setFilter] = useState('Все')
  const [notice, setNotice] = useState('')
  const [portraitRevision, setPortraitRevision] = useState(0)
  const imageUrls = useRef<string[]>([])
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const profile = editing ? draft : saved
  const theme = themes.find(item => item.value === profile.theme) ?? themes[0]

  useEffect(() => () => imageUrls.current.forEach(url => URL.revokeObjectURL(url)), [])

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  function startEditing() {
    setDraft(saved)
    setEditing(true)
    setNotice('')
  }

  function finishEditing(save: boolean) {
    if (save) {
      if (!draft.name.trim()) {
        setNotice('Укажите имя профиля перед сохранением.')
        setTab('about')
        return
      }
      setSaved({ ...draft, name: draft.name.trim() })
    } else {
      setDraft(saved)
    }
    setEditing(false)
    setNotice(save ? 'Изменения сохранены.' : 'Изменения отменены.')
  }

  function selectPhoto(file: File) {
    setPortraitRevision(value => value + 1)
    if (file.size > 5 * 1024 * 1024) {
      setNotice('Выберите изображение размером до 5 МБ.')
      return
    }
    const url = URL.createObjectURL(file)
    imageUrls.current.push(url)
    update('portrait', url)
    setNotice('')
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % profileTabs.length
    else if (event.key === 'ArrowLeft') next = (index + profileTabs.length - 1) % profileTabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = profileTabs.length - 1
    else return
    event.preventDefault()
    setTab(profileTabs[next].id)
    tabRefs.current[next]?.focus()
  }

  function choices(key: 'systems' | 'styles' | 'genres', options: string[]) {
    return editing ? <div className={styles.checkGrid}>{options.map(label => <Checkbox
      key={label} label={label} checked={profile[key].includes(label)}
      onCheckedChange={checked => update(key, checked ? [...profile[key], label] : profile[key].filter(item => item !== label))}
    />)}</div> : <TagList values={profile[key]} />
  }

  function privacyChecks(keys: Array<typeof privacyFields[number]['key']>) {
    return <div className={styles.stack}>{privacyFields.filter(field => keys.includes(field.key)).map(field => editing
      ? <Checkbox key={field.key} label={field.label} checked={profile.privacy[field.key]} onCheckedChange={checked => update('privacy', { ...profile.privacy, [field.key]: checked })} />
      : <div className={styles.settingRow} key={field.key}><span>{field.label}</span><span className={styles.muted}>{profile.privacy[field.key] ? 'Да' : 'Нет'}</span></div>)}</div>
  }

  const editAction = !editing ? <Button size="sm" decoration="bare" variant="secondary" icon={<EditIcon />} onClick={startEditing}>Редактировать</Button> : undefined
  const preview = <ProfilePreview profile={profile} onPreview={editing ? undefined : () => setTab('about')} />

  return (
    <main className={styles.page} style={{ '--profile-accent': theme.color } as CSSProperties}>
      <div className={styles.profile}>
        <Panel className={styles.hero}>
          <div className={styles.heroActions}>
            {editing ? <>
              <span className={styles.modeLabel}>Редактирование профиля</span>
              <Button size="sm" variant="secondary" icon={null} onClick={() => finishEditing(false)}>Отмена</Button>
              <Button size="sm" icon={null} onClick={() => finishEditing(true)}>Сохранить изменения</Button>
            </> : <Button size="sm" variant="secondary" icon={<EditIcon />} onClick={startEditing}>Редактировать профиль</Button>}
          </div>
          <div className={styles.heroIdentity}>
            <ProfileAvatar profile={profile} />
            <div className={styles.identityText}>
              <p className={styles.eyebrow}>{profile.title}</p>
              <h1>{profile.name || 'Ваше имя'}</h1>
              <p>{profile.tagline}</p>
              <ProfileFacts profile={profile} />
            </div>
            <ProfileStats profile={profile} />
          </div>
        </Panel>

        <div className={styles.tabs} role="tablist" aria-label="Разделы профиля">
          {profileTabs.map((item, index) => <button
            key={item.id} ref={node => { tabRefs.current[index] = node }}
            id={`profile-tab-${item.id}`} type="button" role="tab"
            aria-selected={tab === item.id} aria-controls="profile-content"
            tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)}
            onKeyDown={event => handleTabKey(event, index)}
          >{item.label}</button>)}
        </div>

        <p className={styles.notice} role="status">{notice || (editing ? 'Настройте профиль и сохраните изменения, когда закончите.' : '')}</p>

        <div id="profile-content" role="tabpanel" aria-labelledby={`profile-tab-${tab}`} tabIndex={0} className={styles.columns}>
          {tab === 'about' && <>
            <div className={styles.stack}>
              {editing && <ProfileSection title="Основная информация">
                <div className={styles.fieldGrid}>
                  <TextInput label="Имя профиля" value={profile.name} maxLength={40} required onChange={e => update('name', e.target.value)} />
                  <TextInput label="Город" value={profile.city} maxLength={80} onChange={e => update('city', e.target.value)} />
                  <TextInput fieldClassName={styles.fullSpan} label="Строка под именем" value={profile.tagline} maxLength={120} onChange={e => update('tagline', e.target.value)} />
                </div>
              </ProfileSection>}
              <ProfileSection title="Обо мне" action={editAction}>
                {editing ? <TextArea aria-label="Обо мне" value={profile.bio} maxLength={2000} showCharacterCount onChange={e => update('bio', e.target.value)} /> : <p className={styles.bio}>{profile.bio}</p>}
              </ProfileSection>
              <ProfileSection title="Любимые системы" action={editAction}>{choices('systems', gameSystems)}</ProfileSection>
              <ProfileSection title="Стиль игры" action={editAction}>{choices('styles', playStyles)}</ProfileSection>
              <ProfileSection title="Предпочитаю играть как">
                {editing ? <div className={styles.roleChoices}>{['Мастер', 'Игрок'].map(role => <Button key={role} size="lg" fullWidth variant={profile.role === role ? 'primary' : 'secondary'} aria-pressed={profile.role === role} icon={<PlaceholderIcon />} onClick={() => update('role', role)}>{role}</Button>)}</div> : <div className={styles.factRow}><IconFrame size="2.75rem"><PlaceholderIcon /></IconFrame><div><h3>{profile.role}</h3><p className={styles.muted}>{profile.role === 'Мастер' ? 'Создаю миры, веду кампании, придумываю истории.' : 'Создаю персонажей и исследую их истории.'}</p></div></div>}
              </ProfileSection>
              <ProfileSection title="Любимые жанры и темы" action={editAction}>{choices('genres', genres)}</ProfileSection>
              <ProfileSection title="Контакты и ссылки" action={editAction}>
                <div className={styles.stack}>{profile.links.map((link, index) => <div className={styles.contact} key={link.label}>
                  <span className={styles.inlineIcon}><PlaceholderIcon />{link.label}</span>
                  {editing ? <TextInput aria-label={link.label} value={link.value} onChange={e => update('links', profile.links.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} /> : <span className={styles.muted}>{link.value || 'Не указано'}</span>}
                </div>)}</div>
              </ProfileSection>
              <ProfileSection title="Личная цитата" action={editAction}>
                {editing ? <TextArea aria-label="Личная цитата" value={profile.quote} maxLength={300} showCharacterCount onChange={e => update('quote', e.target.value)} /> : <blockquote className={styles.quote}>{profile.quote}</blockquote>}
              </ProfileSection>
            </div>
            <aside className={styles.stack}>
              <ProfileSection title="Кратко обо мне">
                <div className={styles.stack}>{[[profile.title, 'Основная роль'], ...(profile.privacy.city ? [[profile.city, 'Местоположение']] : []), ['В игре с 2020 года', 'На платформе'], ...(profile.privacy.online ? [['Онлайн', 'Сейчас на сайте']] : [])].map(([value, label]) => <div className={styles.factRow} key={label}><IconFrame size="2.5rem"><PlaceholderIcon /></IconFrame><div>{value}<p className={styles.muted}>{label}</p></div></div>)}</div>
              </ProfileSection>
              {editing ? preview : <ProfileSection title="Избранные значки"><EmptyBadges /><p className={styles.muted}>Значки пока не выбраны.</p></ProfileSection>}
              <ProfileSection title="Последняя активность">
                <div className={styles.stack}>{activityItems.slice(0, 3).map(item => <div className={styles.factRow} key={item.id}><IconFrame size="2.25rem"><PlaceholderIcon /></IconFrame><div><p>{item.action}</p><p className={styles.muted}>{item.title}</p></div></div>)}</div>
                <Button className={styles.sectionFooter} size="sm" decoration="bare" icon={null} onClick={() => setTab('activity')}>Показать всю активность</Button>
              </ProfileSection>
              <ProfileSection title="Статистика профиля"><ProfileStats profile={profile} /></ProfileSection>
            </aside>
          </>}

          {tab === 'personalization' && <>
            <div className={styles.stack}>
              <ProfileSection title="Аватар" action={editAction}>
                <div className={styles.avatarEditor}>
                  {editing ? <div className={styles.portraitPicker}><CharacterPortrait key={`${portraitRevision}-${profile.portrait ?? 'empty'}`} characterName={profile.name} portraitUrl={profile.portrait} onFileSelect={selectPhoto} onRemove={() => update('portrait', null)} /></div> : <ProfileAvatar profile={profile} />}
                  <div><h3>{editing ? 'Добавьте своё изображение' : 'Фото профиля'}</h3><p className={styles.muted}>Изображение до 5 МБ</p><p className={styles.muted}>{editing ? 'Нажмите на портрет, чтобы выбрать файл.' : 'Аватар отображается в профиле и рядом с вашими публикациями.'}</p></div>
                </div>
              </ProfileSection>
              <ProfileSection title="Баннер профиля"><div className={styles.bannerPlaceholder}><PlaceholderIcon /><span>Место для баннера</span></div><p className={styles.muted}>Баннер не выбран</p></ProfileSection>
              <ProfileSection title="Цветовая тема" action={editAction}>
                <div className={styles.swatches}>{themes.map(item => <button type="button" key={item.value} className={styles.swatch} style={{ '--swatch': item.color } as CSSProperties} aria-label={item.label} aria-pressed={profile.theme === item.value} disabled={!editing} onClick={() => update('theme', item.value)} />)}</div>
                <p className={styles.muted}>Акцентный цвет профиля · {theme.label}</p>
              </ProfileSection>
              <ProfileSection title="Рамка аватара"><div className={styles.factRow}><IconFrame size="4rem"><PlaceholderIcon /></IconFrame><div><h3>Стандартная рамка</h3><p className={styles.muted}>Без дополнительного оформления</p></div></div></ProfileSection>
              <ProfileSection title="Фон профиля"><div className={styles.backgroundPlaceholder}><PlaceholderIcon /><span>Фон не выбран</span></div></ProfileSection>
            </div>
            <aside className={styles.stack}>
              <ProfileSection title="Титул" action={editAction}>{editing ? <TextInput label="Ваш титул" value={profile.title} maxLength={30} showCharacterCount onChange={e => update('title', e.target.value)} /> : <div className={styles.factRow}><IconFrame size="2.5rem"><PlaceholderIcon /></IconFrame>{profile.title}</div>}</ProfileSection>
              <ProfileSection title="Значки"><EmptyBadges /><p className={styles.muted}>Места для избранных значков</p></ProfileSection>
              <ProfileSection title="Отображение">{privacyChecks(['online', 'activity', 'followers'])}</ProfileSection>
              {preview}
            </aside>
          </>}

          {tab === 'activity' && <>
            <div className={styles.stack}>
              <ProfileSection title="Фильтр активности"><div className={styles.filters}>{activityFilters.map(value => <Button key={value} size="sm" icon={null} variant={filter === value ? 'primary' : 'secondary'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</Button>)}</div></ProfileSection>
              <ProfileSection title="Закреплённая активность"><div className={styles.activityRow}><div className={styles.mediaPlaceholder}><PlaceholderIcon /></div><div><p className={styles.eyebrow}>Закреплённая статья</p><h3>Тени за Туманными горами</h3><p className={styles.muted}>Мифология, вдохновение и ключевые фракции моего домашнего мира.</p></div></div></ProfileSection>
              <ProfileSection title="Лента активности"><div className={styles.feed}>{activityItems.filter(item => filter === 'Все' || item.category === filter).map(item => <article className={styles.activityRow} key={item.id}>
                <div className={styles.mediaPlaceholder}><PlaceholderIcon /></div><div><div className={styles.activityMeta}><span>{item.action}</span><span>{item.date}</span></div><h3>{item.title}</h3><p className={styles.muted}>{item.description}</p><span className={styles.tag}>{item.category}</span></div>
              </article>)}</div></ProfileSection>
            </div>
            <aside className={styles.stack}>
              <ProfileSection title="Сводка активности"><p className={styles.muted}>За последний месяц</p><dl className={styles.summaryStats}>{[['6', 'Публикаций'], ['3', 'Чарлиста'], ['2', 'Игры'], ['14', 'Комментариев']].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></ProfileSection>
              <ProfileSection title="Последний вход"><div className={styles.inlineIcon}><i className={styles.onlineDot} />Сейчас онлайн</div><p className={styles.muted}>Был(а) на сайте несколько секунд назад</p></ProfileSection>
              <ProfileSection title="Недавние подписчики"><div className={styles.stack}>{['Morwen', 'Kaelthar', 'Лесная_Тень', 'D20Lover'].map((name, i) => <div className={styles.factRow} key={name}><IconFrame size="2.5rem"><PlaceholderIcon /></IconFrame><div>{name}<p className={styles.muted}>{i + 1} дн. назад</p></div></div>)}</div></ProfileSection>
              {preview}
            </aside>
          </>}

          {tab === 'achievements' && <>
            <div className={styles.stack}>
              <ProfileSection title="Избранные достижения"><EmptyBadges /><p className={styles.muted}>Здесь появятся избранные достижения.</p></ProfileSection>
              <ProfileSection title="Все достижения"><div className={styles.emptyState}><PlaceholderIcon /><h3>Достижений пока нет</h3><p className={styles.muted}>Коллекция появится здесь.</p></div></ProfileSection>
            </div>
            <aside className={styles.stack}>
              <ProfileSection title="Витрина значков"><EmptyBadges /><p className={styles.muted}>До пяти значков в вашем профиле.</p></ProfileSection>
              <ProfileSection title="Недавно получено"><p className={styles.muted}>Пока пусто</p></ProfileSection>
              {preview}
            </aside>
          </>}

          {tab === 'privacy' && <>
            <div className={styles.stack}>
              <ProfileSection title="Профильные настройки" action={editAction}><p className={styles.muted}>Выберите, какую информацию о вас видят другие пользователи.</p></ProfileSection>
              <ProfileSection title="Видимость профиля"><p className={styles.muted}>Кто может видеть ваш профиль и основную информацию.</p>{editing ? <Combobox label="Видимость профиля" options={visibilityOptions} value={profile.visibility} onValueChange={value => { if (value) update('visibility', value) }} /> : <p>{visibilityOptions.find(item => item.value === profile.visibility)?.label}</p>}</ProfileSection>
              <ProfileSection title="Кто может писать"><p className={styles.muted}>Кто может отправлять вам личные сообщения.</p>{editing ? <Combobox label="Кто может писать" options={visibilityOptions} value={profile.messages} onValueChange={value => { if (value) update('messages', value) }} /> : <p>{visibilityOptions.find(item => item.value === profile.messages)?.label}</p>}</ProfileSection>
              <ProfileSection title="Показывать в профиле">{privacyChecks(['activity', 'articles', 'characters', 'followers'])}</ProfileSection>
              <ProfileSection title="Дополнительная информация">{privacyChecks(['online', 'city'])}</ProfileSection>
              <ProfileSection title="Чёрный список"><p className={styles.muted}>Нет заблокированных пользователей.</p></ProfileSection>
            </div>
            <aside className={styles.stack}>
              {preview}
              <ProfileSection title="Текущие настройки"><div className={styles.stack}>
                <div className={styles.settingRow}><span>Видимость профиля</span><span className={styles.muted}>{visibilityOptions.find(item => item.value === profile.visibility)?.label}</span></div>
                <div className={styles.settingRow}><span>Сообщения</span><span className={styles.muted}>{visibilityOptions.find(item => item.value === profile.messages)?.label}</span></div>
                {privacyFields.map(field => <div key={field.key} className={styles.settingRow}><span>{field.label.replace('Показывать ', '')}</span><span className={styles.muted}>{profile.privacy[field.key] ? 'Показывается' : 'Скрыто'}</span></div>)}
              </div></ProfileSection>
            </aside>
          </>}
        </div>
      </div>
    </main>
  )
}
