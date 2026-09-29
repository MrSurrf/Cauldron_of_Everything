import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { MenuButton, Panel } from '../../shared/ui'
import { getAccessToken } from '../../tools/survey'
import AuthPage from '../auth/AuthPage'
import { GuideDemo } from './guide/GuideDemo'
import styles from './DevHomePage.module.css'

export function DevHomeMenu() {
  const navigate = useNavigate()
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <main className={styles.page}>
      <Panel className={styles.menuPanel} padding="normal">
        <p className={styles.eyebrow}>Среда разработки</p>
        <h1>Мастерская</h1>
        <p className={styles.intro}>Выберите инструмент для проверки.</p>
        <nav className={styles.menu} aria-label="Инструменты разработки">
          <MenuButton icon={null} onClick={() => navigate('/encyclopedia')}>
            Энциклопедия
          </MenuButton>
          <MenuButton icon={null} onClick={() => navigate('/encyclopedia/bestiary')}>
            Бестиарий
          </MenuButton>
          <MenuButton icon={null} onClick={() => navigate('/tools/character-sheet')}>
            Лист персонажа
          </MenuButton>
          <MenuButton icon={null} onClick={() => navigate('/profile')}>
            Профиль
          </MenuButton>
          <MenuButton icon={null} onClick={() => setGuideOpen(true)}>
            Guide — знакомство с Виззом
          </MenuButton>
        </nav>
      </Panel>
      {guideOpen && <GuideDemo onClose={() => setGuideOpen(false)} />}
    </main>
  )
}

export default function DevHomePage() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAccessToken()))

  if (window.location.hash === '#/gm') {
    return <Navigate to="/survey#/gm" replace />
  }

  if (!authenticated) {
    return (
      <AuthPage
        onLogin={() => setAuthenticated(true)}
      />
    )
  }

  return <DevHomeMenu />
}
