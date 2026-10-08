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

import { TextInput } from '../../shared/ui/TextInput'
import { PlaceholderIcon } from '../../shared/ui/icons'
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
    pathPrefixes: ['/tools/', '/survey'],
    items: [
      {
        label: 'Лист персонажа',
        description: 'Интерактивный лист героя',
        to: '/tools/character-sheet',
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
        ? `/encyclopedia?search=${encodeURIComponent(query)}`
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

          <span
            className={`${styles.navControl} ${styles.navControlDisabled}`}
            aria-disabled={true}
          >
            Статьи
          </span>

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
            <PlaceholderIcon />
            <span className={styles.notificationDot} aria-hidden={true} />
          </button>

          <NavLink
            className={styles.profileLink}
            to="/profile"
            data-guide-target="profile"
            aria-label="Открыть профиль"
            onClick={closeNavigation}
          >
            <span className={styles.profileCircle} aria-hidden={true} />
          </NavLink>
        </div>
      </div>
    </header>
  )
}
