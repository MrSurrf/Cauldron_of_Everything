import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

import { getProfile, patchProfile, uploadAvatar } from '../../shared/api/account'
import { Button, Checkbox, Combobox, EditIcon, IconFrame, Panel, PlaceholderIcon, TextArea, TextInput } from '../../shared/ui'
import { CharacterPortrait } from '../../tools/character-sheet'
import { ProfileAvatar, ProfileFacts, ProfilePreview, ProfileSection, TagList } from './ProfileParts'
import { cloneProfile, emptyProfile, gameSystems, genres, normalizeProfile, playStyles, privacyFields, profileTabs, themes, visibilityOptions } from './profileModel'
import type { ProfileData, ProfileTab } from './profileModel'
import { readProfileCache, writeProfileCache } from './profileCache'
import styles from './ProfilePage.module.css'

type Notice = { kind: 'status' | 'error'; text: string } | null

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function externalHref(value: string): string | null {
  const normalized = value.trim()
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (/^www\./i.test(normalized)) return `https://${normalized}`
  return null
}

export default function ProfilePage() {
  const [initialProfile] = useState(() => readProfileCache() ?? cloneProfile(emptyProfile))
  const [tab, setTab] = useState<ProfileTab>('about')
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState<ProfileData>(() => cloneProfile(initialProfile))
  const [draft, setDraft] = useState<ProfileData>(() => cloneProfile(initialProfile))
  const [notice, setNotice] = useState<Notice>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadRevision, setLoadRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const [portraitRevision, setPortraitRevision] = useState(0)
  const pendingPortraitFile = useRef<File | null>(null)
  const portraitPreviewUrl = useRef<string | null>(null)
  const editingRef = useRef(false)
  const draftTouchedRef = useRef(false)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const profile = editing ? draft : saved
  const theme = themes.find(item => item.value === profile.theme) ?? themes[0]
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  )

  useEffect(() => () => {
    if (portraitPreviewUrl.current) URL.revokeObjectURL(portraitPreviewUrl.current)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const remote = await getProfile()
        if (cancelled) return
        const normalized = normalizeProfile(remote.data)
        setSaved(normalized)
        writeProfileCache(normalized)
        if (!editingRef.current || !draftTouchedRef.current) setDraft(cloneProfile(normalized))
      } catch (error) {
        if (!cancelled) setLoadError(errorMessage(error, 'Не удалось загрузить профиль с сервера.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [loadRevision])

  useEffect(() => {
    if (!editing || !hasUnsavedChanges) return
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnAboutUnsavedChanges)
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges)
  }, [editing, hasUnsavedChanges])

  function releasePortraitPreview() {
    if (!portraitPreviewUrl.current) return
    URL.revokeObjectURL(portraitPreviewUrl.current)
    portraitPreviewUrl.current = null
  }

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    draftTouchedRef.current = true
    setDraft(current => ({ ...current, [key]: value }))
  }

  function startEditing() {
    editingRef.current = true
    draftTouchedRef.current = false
    setDraft(cloneProfile(saved))
    setEditing(true)
    setNotice(null)
  }

  async function saveProfile() {
    const name = draft.name.trim()
    if (!name) {
      setNotice({ kind: 'error', text: 'Укажите имя профиля перед сохранением.' })
      setTab('about')
      return
    }

    const links = draft.links
      .map(link => ({ label: link.label.trim(), value: link.value.trim() }))
      .filter(link => link.label || link.value)
    if (links.some(link => !link.label || !link.value)) {
      setNotice({ kind: 'error', text: 'Для каждой ссылки заполните название и адрес.' })
      setTab('about')
      return
    }

    let next = { ...draft, name, links }
    setSaving(true)
    setNotice(null)
    try {
      if (pendingPortraitFile.current) {
        const portrait = await uploadAvatar(pendingPortraitFile.current)
        pendingPortraitFile.current = null
        next = { ...next, portrait }
        const savedWithUploadedPortrait = { ...saved, portrait }
        setSaved(savedWithUploadedPortrait)
        writeProfileCache(savedWithUploadedPortrait)
        setDraft(cloneProfile(next))
        releasePortraitPreview()
      }

      const response = await patchProfile(next)
      const confirmed = normalizeProfile(response.data, next)
      writeProfileCache(confirmed)
      setSaved(confirmed)
      setDraft(cloneProfile(confirmed))
      pendingPortraitFile.current = null
      draftTouchedRef.current = false
      setEditing(false)
      editingRef.current = false
      setNotice({ kind: 'status', text: 'Изменения сохранены.' })
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'Не удалось сохранить изменения. Попробуйте ещё раз.') })
    } finally {
      setSaving(false)
    }
  }

  function cancelEditing() {
    pendingPortraitFile.current = null
    releasePortraitPreview()
    setPortraitRevision(value => value + 1)
    setDraft(cloneProfile(saved))
    draftTouchedRef.current = false
    setEditing(false)
    editingRef.current = false
    setNotice({ kind: 'status', text: 'Изменения отменены.' })
  }

  function selectPhoto(file: File) {
    setPortraitRevision(value => value + 1)
    if (!file.type.startsWith('image/')) {
      setNotice({ kind: 'error', text: 'Выберите файл изображения.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ kind: 'error', text: 'Выберите изображение размером до 5 МБ.' })
      return
    }

    releasePortraitPreview()
    pendingPortraitFile.current = file
    const previewUrl = URL.createObjectURL(file)
    portraitPreviewUrl.current = previewUrl
    update('portrait', previewUrl)
    setNotice(null)
  }

  function removePortrait() {
    pendingPortraitFile.current = null
    releasePortraitPreview()
    setPortraitRevision(value => value + 1)
    update('portrait', null)
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
      key={label}
      label={label}
      checked={profile[key].includes(label)}
      onCheckedChange={checked => update(key, checked ? [...profile[key], label] : profile[key].filter(item => item !== label))}
    />)}</div> : <TagList values={profile[key]} />
  }

  function privacyChecks(keys: Array<typeof privacyFields[number]['key']>) {
    return <div className={styles.stack}>{privacyFields.filter(field => keys.includes(field.key)).map(field => editing
      ? <Checkbox key={field.key} label={field.label} checked={profile.privacy[field.key]} onCheckedChange={checked => update('privacy', { ...profile.privacy, [field.key]: checked })} />
      : <div className={styles.settingRow} key={field.key}><span>{field.label}</span><span className={styles.muted}>{profile.privacy[field.key] ? 'Да' : 'Нет'}</span></div>)}</div>
  }

  function updateLink(index: number, key: 'label' | 'value', value: string) {
    update('links', profile.links.map((link, linkIndex) => linkIndex === index ? { ...link, [key]: value } : link))
  }

  function retryLoad() {
    setLoading(true)
    setLoadError('')
    setLoadRevision(value => value + 1)
  }

  const visibleNotice = notice?.text || loadError || (loading ? 'Загружаем профиль…' : editing ? 'Изменения сохранятся только после нажатия кнопки «Сохранить».' : '')

  return (
    <main className={styles.page} style={{ '--profile-accent': theme.color } as CSSProperties} aria-busy={loading || saving}>
      <div className={styles.profile}>
        <Panel className={styles.hero}>
          <div className={styles.heroActions}>
            {editing ? <>
              <span className={styles.modeLabel}>Редактирование профиля</span>
              <Button size="sm" variant="secondary" icon={null} disabled={saving} onClick={cancelEditing}>Отмена</Button>
              <Button size="sm" icon={null} disabled={saving || !hasUnsavedChanges} onClick={() => void saveProfile()}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
            </> : <Button size="sm" variant="secondary" icon={<EditIcon />} onClick={startEditing}>Редактировать профиль</Button>}
          </div>
          <div className={styles.heroIdentity}>
            <ProfileAvatar profile={profile} />
            <div className={styles.identityText}>
              {profile.title && <p className={styles.eyebrow}>{profile.title}</p>}
              <h1>{profile.name || 'Ваше имя'}</h1>
              {profile.tagline && <p>{profile.tagline}</p>}
              <ProfileFacts profile={profile} />
            </div>
          </div>
        </Panel>

        <div className={styles.tabs} role="tablist" aria-label="Разделы профиля">
          {profileTabs.map((item, index) => <button
            key={item.id}
            ref={node => { tabRefs.current[index] = node }}
            id={`profile-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="profile-content"
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={event => handleTabKey(event, index)}
          >{item.label}</button>)}
        </div>

        <div className={styles.noticeRow}>
          <p className={notice?.kind === 'error' || loadError ? styles.error : styles.notice} role={notice?.kind === 'error' || loadError ? 'alert' : 'status'}>{visibleNotice}</p>
          {loadError && <Button size="sm" decoration="bare" variant="secondary" icon={null} onClick={retryLoad}>Повторить</Button>}
        </div>

        <div id="profile-content" role="tabpanel" aria-labelledby={`profile-tab-${tab}`} tabIndex={0} className={styles.columns}>
          <div className={styles.stack}>
            {tab === 'about' && <>
              {editing && <ProfileSection title="Основная информация">
                <div className={styles.fieldGrid}>
                  <TextInput label="Имя профиля" value={profile.name} maxLength={40} required onChange={event => update('name', event.target.value)} />
                  <TextInput label="Город" value={profile.city} maxLength={80} onChange={event => update('city', event.target.value)} />
                  <TextInput fieldClassName={styles.fullSpan} label="Строка под именем" value={profile.tagline} maxLength={120} onChange={event => update('tagline', event.target.value)} />
                </div>
              </ProfileSection>}
              <ProfileSection title="Обо мне">
                {editing ? <TextArea aria-label="Обо мне" value={profile.bio} maxLength={2000} showCharacterCount onChange={event => update('bio', event.target.value)} /> : <p className={profile.bio ? styles.bio : styles.muted}>{profile.bio || 'Расскажите немного о себе.'}</p>}
              </ProfileSection>
              <ProfileSection title="Любимые системы">{choices('systems', gameSystems)}</ProfileSection>
              <ProfileSection title="Стиль игры">{choices('styles', playStyles)}</ProfileSection>
              <ProfileSection title="Предпочитаю играть как">
                {editing ? <div className={styles.roleChoices}>{['Мастер', 'Игрок'].map(role => <Button key={role} size="lg" fullWidth variant={profile.role === role ? 'primary' : 'secondary'} aria-pressed={profile.role === role} icon={<PlaceholderIcon />} onClick={() => update('role', role)}>{role}</Button>)}</div> : profile.role ? <div className={styles.factRow}><IconFrame size="2.75rem"><PlaceholderIcon /></IconFrame><div><h3>{profile.role}</h3><p className={styles.muted}>{profile.role === 'Мастер' ? 'Создаю миры, веду кампании и придумываю истории.' : 'Создаю персонажей и исследую их истории.'}</p></div></div> : <p className={styles.muted}>Роль пока не выбрана.</p>}
              </ProfileSection>
              <ProfileSection title="Любимые жанры и темы">{choices('genres', genres)}</ProfileSection>
              <ProfileSection title="Контакты и ссылки">
                {editing ? <div className={styles.stack}>
                  {profile.links.map((link, index) => <div className={styles.linkEditor} key={index}>
                    <TextInput label="Название" value={link.label} maxLength={50} onChange={event => updateLink(index, 'label', event.target.value)} />
                    <TextInput label="Адрес или контакт" value={link.value} maxLength={200} onChange={event => updateLink(index, 'value', event.target.value)} />
                    <Button size="sm" decoration="bare" variant="secondary" icon={null} aria-label={`Удалить ссылку ${link.label || index + 1}`} onClick={() => update('links', profile.links.filter((_, linkIndex) => linkIndex !== index))}>Удалить</Button>
                  </div>)}
                  {profile.links.length < 10 && <Button className={styles.linkAction} size="sm" variant="secondary" icon={null} onClick={() => update('links', [...profile.links, { label: '', value: '' }])}>Добавить ссылку</Button>}
                </div> : profile.links.length ? <div className={styles.stack}>{profile.links.map((link, index) => {
                  const href = externalHref(link.value)
                  return <div className={styles.contact} key={`${link.label}-${index}`}>
                    <span className={styles.inlineIcon}><PlaceholderIcon />{link.label}</span>
                    {href ? <a className={styles.profileLink} href={href} target="_blank" rel="noreferrer">{link.value}</a> : <span className={styles.muted}>{link.value}</span>}
                  </div>
                })}</div> : <p className={styles.muted}>Контакты пока не указаны.</p>}
              </ProfileSection>
              <ProfileSection title="Личная цитата">
                {editing ? <TextArea aria-label="Личная цитата" value={profile.quote} maxLength={300} showCharacterCount onChange={event => update('quote', event.target.value)} /> : profile.quote ? <blockquote className={styles.quote}>{profile.quote}</blockquote> : <p className={styles.muted}>Цитата пока не указана.</p>}
              </ProfileSection>
            </>}

            {tab === 'personalization' && <>
              <ProfileSection title="Аватар">
                <div className={styles.avatarEditor}>
                  {editing ? <div className={styles.portraitPicker}><CharacterPortrait key={`${portraitRevision}-${profile.portrait ?? 'empty'}`} characterName={profile.name} imageLabel={{ alt: 'Аватар профиля', action: 'изображение профиля' }} portraitUrl={profile.portrait} onFileSelect={selectPhoto} onRemove={removePortrait} /></div> : <ProfileAvatar profile={profile} />}
                  <div><h3>{editing ? 'Добавьте своё изображение' : 'Фото профиля'}</h3><p className={styles.muted}>Изображение до 5 МБ</p><p className={styles.muted}>{editing ? 'Нажмите на портрет, чтобы выбрать файл.' : 'Аватар отображается в профиле и рядом с вашими публикациями.'}</p></div>
                </div>
              </ProfileSection>
              <ProfileSection title="Титул">{editing ? <TextInput label="Ваш титул" value={profile.title} maxLength={30} showCharacterCount onChange={event => update('title', event.target.value)} /> : <p className={profile.title ? undefined : styles.muted}>{profile.title || 'Титул пока не указан.'}</p>}</ProfileSection>
              <ProfileSection title="Цветовая тема">
                <div className={styles.swatches}>{themes.map(item => <button type="button" key={item.value} className={styles.swatch} style={{ '--swatch': item.color } as CSSProperties} aria-label={item.label} aria-pressed={profile.theme === item.value} disabled={!editing} onClick={() => update('theme', item.value)} />)}</div>
                <p className={styles.muted}>Акцентный цвет профиля · {theme.label}</p>
              </ProfileSection>
            </>}

            {tab === 'privacy' && <>
              <ProfileSection title="Видимость профиля"><p className={styles.muted}>Кто может видеть ваш профиль и основную информацию.</p>{editing ? <Combobox label="Видимость профиля" options={visibilityOptions} value={profile.visibility} onValueChange={value => { if (value === 'all' || value === 'friends' || value === 'none') update('visibility', value) }} /> : <p>{visibilityOptions.find(item => item.value === profile.visibility)?.label}</p>}</ProfileSection>
              <ProfileSection title="Кто может писать"><p className={styles.muted}>Кто может отправлять вам личные сообщения.</p>{editing ? <Combobox label="Кто может писать" options={visibilityOptions} value={profile.messages} onValueChange={value => { if (value === 'all' || value === 'friends' || value === 'none') update('messages', value) }} /> : <p>{visibilityOptions.find(item => item.value === profile.messages)?.label}</p>}</ProfileSection>
              <ProfileSection title="Показывать в профиле">{privacyChecks(['activity', 'articles', 'characters', 'followers'])}</ProfileSection>
              <ProfileSection title="Дополнительная информация">{privacyChecks(['online', 'city'])}</ProfileSection>
            </>}
          </div>

          <aside className={styles.stack}>
            <ProfilePreview profile={profile} />
          </aside>
        </div>
      </div>
    </main>
  )
}
