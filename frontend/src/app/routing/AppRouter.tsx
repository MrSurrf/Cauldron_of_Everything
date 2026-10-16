import {
  lazy,
  Suspense,
} from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { SiteHeader } from '../layouts/SiteHeader'
import AuthPage from '../../pages/auth/AuthPage'
import { AccessGate } from './AccessGate'
import styles from './AppRouter.module.css'

const SurveyRoutePage = lazy(
  () => import('../../pages/survey/SurveyRoutePage'),
)
const DevHomePage = lazy(
  () => import('../../pages/dev/DevHomePage'),
)
const HomePage = lazy(() => import('../../pages/home/HomePage'))
const ProfilePage = lazy(
  () => import('../../pages/profile/ProfilePage'),
)
const CampaignTableRoutePage = lazy(() => import('../../pages/campaign-table/CampaignTableRoutePage'))
const CharacterSheetRoutePage = lazy(
  () => import('../../pages/character-sheet/CharacterSheetRoutePage'),
)
const CharactersPage = lazy(
  () => import('../../pages/characters/CharactersPage'),
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
const ArticlesPage = lazy(() => import('../../pages/articles/ArticlesPage'))
const SpellsPage = lazy(() => import('../../pages/encyclopedia/SpellsPage'))
const ItemsPage = lazy(() => import('../../pages/encyclopedia/ItemsPage'))
const ClassesPage = lazy(() => import('../../pages/encyclopedia/ClassesPage'))
const BackgroundsPage = lazy(() => import('../../pages/encyclopedia/BackgroundsPage'))
const EncyclopediaSectionPage = lazy(() => import('../../pages/encyclopedia/EncyclopediaSectionPage'))
const EncyclopediaEntryPage = lazy(() => import('../../pages/encyclopedia/EncyclopediaEntryPage'))
const ItemEntityPage = lazy(() => import('../../pages/encyclopedia/ItemEntityPage'))

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

function LoginPreviewPage() {
  const navigate = useNavigate()

  return (
    <AuthPage
      onLogin={() => navigate('/')}
      onBack={() => navigate('/')}
    />
  )
}

function RoutedApp() {
  const location = useLocation()

  return (
    <AccessGate>
      <div className={styles.shell}>
        {location.pathname !== '/dev/login-preview' && <SiteHeader />}
        <div className={styles.content}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route
                path="/"
                element={<HomePage />}
              />
              <Route path="/dev" element={<DevHomePage />} />
              <Route
                path="/survey"
                element={<SurveyRoutePage />}
              />
              <Route path="/dev/login-preview" element={<LoginPreviewPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-table" element={<CampaignTableRoutePage />} />
              <Route path="/characters" element={<CharactersPage />} />
              <Route path="/encyclopedia" element={<EncyclopediaPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/encyclopedia/entry/:id" element={<EncyclopediaEntryPage />} />
              <Route path="/encyclopedia/item/:slug" element={<ItemEntityPage />} />
              <Route path="/encyclopedia/spells" element={<SpellsPage />} />
              <Route path="/encyclopedia/items" element={<ItemsPage />} />
              <Route path="/encyclopedia/classes" element={<ClassesPage />} />
              <Route path="/encyclopedia/backgrounds" element={<BackgroundsPage />} />
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
    </AccessGate>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  )
}
