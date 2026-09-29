import {
  lazy,
  Suspense,
} from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import { SiteHeader } from '../layouts/SiteHeader'
import styles from './AppRouter.module.css'

const SurveyRoutePage = lazy(
  () => import('../../pages/survey/SurveyRoutePage'),
)
const DevHomePage = lazy(
  () => import('../../pages/dev/DevHomePage'),
)
const ProfilePage = lazy(
  () => import('../../pages/profile/ProfilePage'),
)
const CharacterSheetRoutePage = lazy(
  () => import('../../pages/character-sheet/CharacterSheetRoutePage'),
)
const BestiaryEntityPage = lazy(
  () =>
    import(
      '../../pages/encyclopedia/BestiaryEntityPage'
    ),
)
const BestiaryPage = lazy(
  () => import('../../pages/encyclopedia/BestiaryPage'),
)
const MockTarrasquePage = lazy(
  () => import('../../pages/encyclopedia/MockTarrasquePage'),
)
const EncyclopediaPage = lazy(() => import('../../pages/encyclopedia/EncyclopediaPage'))
const SpellsPage = lazy(() => import('../../pages/encyclopedia/SpellsPage'))
const EncyclopediaSectionPage = lazy(() => import('../../pages/encyclopedia/EncyclopediaSectionPage'))
const EncyclopediaEntryPage = lazy(() => import('../../pages/encyclopedia/EncyclopediaEntryPage'))

function RouteFallback() {
  return (
    <div
      className={styles.fallback}
      data-cursor-light-background=""
      role="status"
    >
      Загрузка…
    </div>
  )
}

function NotFoundPage() {
  return (
    <main className={styles.notFound}>
      <p>404</p>
      <h1>Страница не найдена</h1>
      <a href="/">На главную</a>
    </main>
  )
}

function BestiaryRoute() {
  const location = useLocation()

  return <BestiaryPage key={location.search} />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <div className={styles.shell}>
        <SiteHeader />
        <div className={styles.content}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route
                path="/"
                element={<DevHomePage />}
              />
              <Route
                path="/survey"
                element={<SurveyRoutePage />}
              />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/encyclopedia" element={<EncyclopediaPage />} />
              <Route path="/encyclopedia/entry/:id" element={<EncyclopediaEntryPage />} />
              <Route path="/encyclopedia/spells" element={<SpellsPage />} />
              <Route path="/encyclopedia/:sectionId" element={<EncyclopediaSectionPage />} />
              <Route
                path="/tools/character-sheet"
                element={<CharacterSheetRoutePage />}
              />
              <Route
                path="/encyclopedia/bestiary"
                element={<BestiaryRoute />}
              />
              <Route
                path="/encyclopedia/bestiary/tarrasque"
                element={<MockTarrasquePage />}
              />
              <Route
                path="/encyclopedia/bestiary/:slug"
                element={<BestiaryEntityPage />}
              />
              <Route
                path="/encyclopedia/creature/:slug"
                element={<BestiaryEntityPage />}
              />
              <Route
                path="*"
                element={<NotFoundPage />}
              />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  )
}
