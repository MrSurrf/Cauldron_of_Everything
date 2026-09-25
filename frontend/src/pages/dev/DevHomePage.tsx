import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { MenuButton, Panel } from '../../shared/ui'
import { getAccessToken, SurveyLoginPage } from '../../tools/survey'
import styles from './DevHomePage.module.css'

export function DevHomeMenu() {
  const navigate = useNavigate()

  return (
    <main className={styles.page}>
      <Panel className={styles.menuPanel} padding="normal">
        <p className={styles.eyebrow}>Среда разработки</p>
        <h1>Мастерская</h1>
        <p className={styles.intro}>Выберите инструмент для проверки.</p>
        <nav className={styles.menu} aria-label="Инструменты разработки">
          <MenuButton icon={null} onClick={() => navigate('/encyclopedia/bestiary')}>
            Бестиарий
          </MenuButton>
          <MenuButton icon={null} onClick={() => navigate('/tools/character-sheet')}>
            Лист персонажа
          </MenuButton>
          <MenuButton icon={null} disabled title="Раздел в разработке">
            Профиль (в разработке)
          </MenuButton>
        </nav>
      </Panel>
    </main>
  )
}

export default function DevHomePage() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAccessToken()))

  if (window.location.hash === '#/gm') {
    return <Navigate to="/survey#/gm" replace />
  }

  if (!authenticated) {
    return <SurveyLoginPage title="Вход в мастерскую" onLogin={() => setAuthenticated(true)} />
  }

  return <DevHomeMenu />
}
