import { useState, type FormEvent } from 'react'
import { requestCode, verifyCode, saveTokens } from '../auth'
import './LoginPage.css'

// ВРЕМЕННЫЙ экран входа по email-коду.
// Нарочно простой и нейтральный: фронтендер может заменить этот файл
// и LoginPage.css целиком, не трогая остальные страницы анкеты.

type LoginPageProps = {
  onLogin: () => void
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      await requestCode(email.trim())
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить код')
    } finally {
      setIsPending(false)
    }
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      const tokens = await verifyCode(email.trim(), code.trim())
      saveTokens(tokens)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">Вход в анкету</h1>

        {step === 'email' ? (
          <form className="login-page__form" onSubmit={handleEmailSubmit}>
            <label className="login-page__label" htmlFor="login-email">
              Введите вашу почту — мы отправим код для входа
            </label>
            <input
              id="login-email"
              className="login-page__input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              autoFocus
            />
            <button
              className="login-page__submit"
              type="submit"
              disabled={isPending || !email.trim()}
            >
              {isPending ? 'Отправляем…' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form className="login-page__form" onSubmit={handleCodeSubmit}>
            <label className="login-page__label" htmlFor="login-code">
              Код из письма отправлен на {email}
            </label>
            <input
              id="login-code"
              className="login-page__input"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
            />
            <button
              className="login-page__submit"
              type="submit"
              disabled={isPending || code.trim().length !== 6}
            >
              {isPending ? 'Проверяем…' : 'Войти'}
            </button>
            <button
              className="login-page__back"
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
              }}
            >
              Указать другую почту
            </button>
          </form>
        )}

        {error && <p className="login-page__error">{error}</p>}
      </div>
    </main>
  )
}

export default LoginPage
