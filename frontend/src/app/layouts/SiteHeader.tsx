import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { getProfile } from '../../shared/api/account'
import {
  getAccountProfileCacheKey,
  PROFILE_CACHE_CHANGED_EVENT,
  readAccountProfileCache,
  writeAccountProfileCache,
} from '../../shared/api/accountProfileCache'
import type { AccountProfileCacheChange } from '../../shared/api/accountProfileCache'
import { AUTH_CHANGED_EVENT } from '../../shared/api/auth'
import { TextInput } from '../../shared/ui/TextInput'
import {
  NotificationIcon,
  PlaceholderIcon,
} from '../../shared/ui/icons'
import styles from './SiteHeader.module.css'

type MenuId = 'find-table' | 'tools' | 'my-table'

type HeaderMenuItem = {
  description: string
  label: string
  to?: string
}

type HeaderMenu = {
  id: MenuId
  items: readonly HeaderMenuItem[]
  label: string
  pathPrefixes: readonly string[]
}

function portraitSource(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const api = new URL(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000', window.location.origin)
    const url = new URL(value.trim(), `${api.origin}/`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function HeaderPortraitImage({ source }: { source: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? null : <img className={styles.profileImage} src={source} alt="" onError={() => setFailed(true)} />
}

function HeaderProfilePortrait() {
  const [profile, setProfile] = useState(() => ({
    key: getAccountProfileCacheKey(),
    portrait: portraitSource(readAccountProfileCache()?.portrait),
  }))

  useEffect(() => {
    let revision = 0
    let controller: AbortController | undefined

    function invalidateRequest() {
      revision += 1
      controller?.abort()
    }

    function showCache() {
      setProfile({ key: getAccountProfileCacheKey(), portrait: portraitSource(readAccountProfileCache()?.portrait) })
    }

    async function load() {
      invalidateRequest()
      const key = getAccountProfileCacheKey()
      if (!key) return
      const sequence = revision
      controller = new AbortController()
      const signal = controller.signal
      try {
        const response = await getProfile(signal)
        // Сохранение профиля и смена аккаунта важнее старого GET-запроса.
        if (!signal.aborted && sequence === revision && key === getAccountProfileCacheKey()) writeAccountProfileCache(response.data)
      } catch {
        // Сбой загрузки не мешает навигации: остаётся кэш или пустой аватар.
      }
    }

    function authChanged() {
      showCache()
      void load()
    }

    function cacheChanged(event: Event) {
      const change = (event as CustomEvent<AccountProfileCacheChange>).detail
      if (!change || change.key !== getAccountProfileCacheKey()) return
      invalidateRequest()
      setProfile({ key: change.key, portrait: portraitSource(change.profile.portrait) })
    }

    function storageChanged(event: StorageEvent) {
      if (!event.key || event.key === 'surveyAuth.access' || event.key === 'surveyAuth.refresh') authChanged()
      else if (event.key === getAccountProfileCacheKey()) {
        invalidateRequest()
        showCache()
      }
    }

    window.addEventListener(AUTH_CHANGED_EVENT, authChanged)
    window.addEventListener(PROFILE_CACHE_CHANGED_EVENT, cacheChanged)
    window.addEventListener('storage', storageChanged)
    void load()
    return () => {
      invalidateRequest()
      window.removeEventListener(AUTH_CHANGED_EVENT, authChanged)
      window.removeEventListener(PROFILE_CACHE_CHANGED_EVENT, cacheChanged)
      window.removeEventListener('storage', storageChanged)
    }
  }, [])

  const source = profile.key === getAccountProfileCacheKey() ? profile.portrait : null
  return <span className={styles.profileCircle} aria-hidden={true}>
    {source && <HeaderPortraitImage key={source} source={source} />}
  </span>
}

const HEADER_MENUS: readonly HeaderMenu[] = [
  {
    id: 'find-table',
    label: 'Поиск стола',
    pathPrefixes: [],
    items: [
      { label: 'Игры', description: 'Найти и присоединиться' },
      { label: 'Мастера', description: 'Ведущие и их столы' },
      { label: 'Игроки', description: 'Найти компанию' },
      { label: 'Клубы', description: 'Сообщества и гильдии' },
      { label: 'Площадки', description: 'Антикафе, клубы, магазины' },
      { label: 'Бронирование', description: 'Забронировать стол или зал' },
    ],
  },
  {
    id: 'tools',
    label: 'Инструменты',
    pathPrefixes: ['/characters', '/tools/', '/survey'],
    items: [
      {
        label: 'Мои персонажи',
        description: 'Герои, чарлисты и кампании',
        to: '/characters',
      },
      {
        label: 'Опросник',
        description: 'Подготовка к нулевой сессии',
        to: '/survey',
      },
      { label: 'Генераторы', description: 'Заготовки для игры' },
    ],
  },
  {
    id: 'my-table',
    label: 'Мой стол',
    pathPrefixes: ['/profile', '/my-table'],
    items: [
      { label: 'Пространство кампании', description: 'Схемы, существа и связи', to: '/my-table' },
      {
        label: 'Профиль игрока',
        description: 'Настройки и публичная страница',
        to: '/profile',
      },
      { label: 'Чарлисты', description: 'Персонажи ваших игр' },
      { label: 'Материалы', description: 'Личная библиотека' },
      { label: 'Мои игры', description: 'Расписание и приглашения' },
    ],
  },
]

function DropdownItem({
  item,
  onNavigate,
}: {
  item: HeaderMenuItem
  onNavigate: () => void
}) {
  const content = (
    <>
      <span className={styles.dropdownIcon} aria-hidden={true}>
        <PlaceholderIcon />
      </span>
      <span className={styles.dropdownCopy}>
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
    </>
  )

  if (!item.to) {
    return (
      <div
        className={styles.dropdownItem}
        data-disabled={true}
        aria-disabled={true}
      >
        {content}
      </div>
    )
  }

  return (
    <NavLink
      className={styles.dropdownItem}
      to={item.to}
      onClick={onNavigate}
    >
      {content}
    </NavLink>
  )
}

export function SiteHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const headerRef = useRef<HTMLElement>(null)
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 8)
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(location.search).get('search') ?? '',
  )

  useEffect(() => {
    function updateScrollState() {
      setIsScrolled(window.scrollY > 8)
    }

    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      ) {
        setOpenMenu(null)
        setMobileMenuOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpenMenu(null)
      setMobileMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchQuery.trim()
    navigate(
      query
        ? `/encyclopedia?search=${encodeURIComponent(query)}&search_mode=full`
        : '/encyclopedia',
    )
  }

  function closeNavigation() {
    setOpenMenu(null)
    setMobileMenuOpen(false)
  }

  return (
    <header
      ref={headerRef}
      className={styles.header}
      data-scrolled={isScrolled || undefined}
    >
      <div className={styles.surface} aria-hidden={true} />

      <div className={styles.inner}>
        <Link
          className={styles.brand}
          to="/"
          aria-label="Cauldron of Everything — на главную"
          onClick={closeNavigation}
        >
          <img className={styles.logo} src="/favicon.svg" alt="" />
          <span className={styles.brandName} aria-hidden={true}>
            <span>Cauldron</span>
            <span>of Everything</span>
          </span>
        </Link>

        <nav
          className={styles.navigation}
          data-mobile-open={mobileMenuOpen}
          aria-label="Основная навигация"
        >
          <NavLink
            className={({ isActive }) =>
              `${styles.navControl} ${isActive ? styles.navControlActive : ''}`
            }
            to="/encyclopedia"
            data-guide-target="encyclopedia"
            onClick={closeNavigation}
          >
            Энциклопедия
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `${styles.navControl} ${isActive ? styles.navControlActive : ''}`
            }
            to="/articles"
            onClick={closeNavigation}
          >
            Статьи
          </NavLink>

          {HEADER_MENUS.map((menu) => {
            const isOpen = openMenu === menu.id
            const isActive = menu.pathPrefixes.some((prefix) =>
              location.pathname.startsWith(prefix),
            )

            return (
              <div
                key={menu.id}
                className={styles.menuGroup}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') setOpenMenu(menu.id)
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== 'touch') setOpenMenu(null)
                }}
              >
                <button
                  className={`${styles.navControl} ${isActive ? styles.navControlActive : ''}`}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`header-menu-${menu.id}`}
                  data-guide-target={menu.id}
                  onClick={() => setOpenMenu(isOpen ? null : menu.id)}
                >
                  <span>{menu.label}</span>
                  <span className={styles.chevron} aria-hidden={true} />
                </button>

                <div
                  id={`header-menu-${menu.id}`}
                  className={styles.dropdown}
                  data-open={isOpen}
                >
                  <div className={styles.dropdownInner}>
                    {menu.items.map((item) => (
                      <DropdownItem
                        key={item.label}
                        item={item}
                        onNavigate={closeNavigation}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className={styles.actions}>
          <form className={styles.search} role="search" onSubmit={submitSearch}>
            <TextInput
              aria-label="Поиск по сайту"
              className={styles.searchInput}
              fieldClassName={styles.searchField}
              placeholder="Поиск..."
              rootClassName={styles.searchFrame}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </form>

          <NavLink
            className={({ isActive }) => `${styles.workshopLink} ${isActive ? styles.workshopLinkActive : ''}`}
            to="/dev"
            onClick={closeNavigation}
          >
            Мастерская
          </NavLink>

          <button
            className={`${styles.iconButton} ${styles.mobileMenuButton}`}
            type="button"
            aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            data-guide-target="mobile-menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
          >
            <PlaceholderIcon />
          </button>

          <button
            className={`${styles.iconButton} ${styles.notificationButton}`}
            type="button"
            aria-label="Уведомления"
          >
            <NotificationIcon />
            <span className={styles.notificationDot} aria-hidden={true} />
          </button>

          <NavLink
            className={styles.profileLink}
            to="/profile"
            data-guide-target="profile"
            aria-label="Открыть профиль"
            onClick={closeNavigation}
          >
            <HeaderProfilePortrait />
          </NavLink>
        </div>
      </div>
    </header>
  )
}
