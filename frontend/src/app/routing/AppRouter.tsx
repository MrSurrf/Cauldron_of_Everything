import {
  lazy,
  Suspense,
} from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'

import styles from './AppRouter.module.css'

const SurveyRoutePage = lazy(
  () => import('../../pages/survey/SurveyRoutePage'),
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

function RouteFallback() {
  return (
    <div
      className={styles.fallback}
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

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/"
            element={<SurveyRoutePage />}
          />
          <Route
            path="/encyclopedia/bestiary"
            element={<BestiaryPage />}
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
    </BrowserRouter>
  )
}
