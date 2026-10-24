import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import AuthPage from '../../pages/auth/AuthPage'
import { AUTH_CHANGED_EVENT, checkSession } from '../../shared/api/auth'
import { Button } from '../../shared/ui'
import styles from './AppRouter.module.css'

export function AccessGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [revision, setRevision] = useState(0)
  const request = `${location.key}:${revision}`
  const [access, setAccess] = useState<{ request: string; status: 'allowed' | 'guest' | 'error' } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let latest = 0
    async function verify() {
      const sequence = ++latest
      try {
        const allowed = await checkSession(controller.signal)
        if (!controller.signal.aborted && sequence === latest) setAccess({ request, status: allowed ? 'allowed' : 'guest' })
      } catch {
        if (!controller.signal.aborted && sequence === latest) setAccess({ request, status: 'error' })
      }
    }
    void verify()
    const interval = window.setInterval(() => { void verify() }, 60_000)
    const recheck = () => { void verify() }
    window.addEventListener('focus', recheck)
    return () => {
      controller.abort()
      window.clearInterval(interval)
      window.removeEventListener('focus', recheck)
    }
  }, [request])

  useEffect(() => {
    const invalidate = () => setRevision(value => value + 1)
    const storageChanged = (event: StorageEvent) => {
      if (!event.key || event.key === 'surveyAuth.access' || event.key === 'surveyAuth.refresh') invalidate()
    }
    window.addEventListener(AUTH_CHANGED_EVENT, invalidate)
    window.addEventListener('storage', storageChanged)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, invalidate)
      window.removeEventListener('storage', storageChanged)
    }
  }, [])

  if (access?.request !== request) return <div className={styles.fallback} role="status">Проверяем доступ…</div>
  if (access.status === 'guest') return <AuthPage onLogin={() => setRevision(value => value + 1)} />
  if (access.status === 'error') return <div className={styles.notFound} role="alert">
    <p>Не удалось проверить доступ к сайту.</p>
    <Button size="md" icon={null} onClick={() => setRevision(value => value + 1)}>Повторить</Button>
  </div>
  return children
}
