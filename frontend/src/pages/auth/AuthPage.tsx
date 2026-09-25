import {
  useState,
  type FormEvent,
} from 'react'

import {
  Button,
  Checkbox,
  Panel,
  TextInput,
} from '../../shared/ui'
import {
  requestCode,
  saveTokens,
  verifyCode,
} from '../../tools/survey/auth'
import styles from './AuthPage.module.css'

type AuthPageProps = {
  onLogin: () => void
}

export default function AuthPage({
  onLogin,
}: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>(
    'email',
  )
  const [error, setError] = useState<string | null>(
    null,
  )
  const [isPending, setIsPending] = useState(false)

  async function handleEmailSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      await requestCode(email.trim())
      setStep('code')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось отправить код',
      )
    } finally {
      setIsPending(false)
    }
  }

  async function handleCodeSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      const tokens = await verifyCode(
        email.trim(),
        code.trim(),
      )
      saveTokens(tokens)
      onLogin()
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : 'Неверный код',
      )
    } finally {
      setIsPending(false)
    }
  }

  function returnToEmail() {
    setStep('email')
    setCode('')
    setError(null)
  }

  return (
    <main className={styles.page}>
      <Panel
        className={styles.authPanel}
        padding="none"
      >
        <div className={styles.layout}>
          <section
            className={styles.emptySide}
            aria-hidden="true"
          />

          <section
            className={styles.authSide}
            aria-labelledby="auth-title"
          >
            <div className={styles.authContent}>
              <div
                className={styles.tabs}
                role="tablist"
                aria-label="Способ авторизации"
              >
                <Button
                  id="auth-title"
                  className={`${styles.tab} ${styles.activeTab}`}
                  decoration="bare"
                  icon={null}
                  role="tab"
                  size="md"
                  aria-selected="true"
                >
                  Вход
                </Button>
                <Button
                  className={styles.tab}
                  decoration="bare"
                  disabled
                  icon={null}
                  role="tab"
                  size="md"
                  aria-selected="false"
                >
                  Регистрация
                </Button>
              </div>

              {step === 'email' ? (
                <form
                  className={styles.form}
                  onSubmit={handleEmailSubmit}
                >
                  <TextInput
                    id="auth-email"
                    autoComplete="email"
                    autoFocus
                    label="Почта"
                    placeholder="Введите почту"
                    required
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.currentTarget.value)
                    }}
                  />

                  <div className={styles.formMeta}>
                    <Checkbox
                      checked
                      disabled
                      label="Запомнить меня"
                      readOnly
                    />
                    <span
                      className={styles.inactiveLink}
                      aria-disabled="true"
                    >
                      Забыли пароль?
                    </span>
                  </div>

                  <Button
                    fullWidth
                    icon={null}
                    size="lg"
                    type="submit"
                    disabled={
                      isPending || !email.trim()
                    }
                  >
                    {isPending
                      ? 'Отправляем…'
                      : 'Получить код'}
                  </Button>
                </form>
              ) : (
                <form
                  className={styles.form}
                  onSubmit={handleCodeSubmit}
                >
                  <p className={styles.codeNotice}>
                    Код отправлен на <strong>{email}</strong>
                  </p>
                  <TextInput
                    id="auth-code"
                    autoComplete="one-time-code"
                    autoFocus
                    inputMode="numeric"
                    label="Код из письма"
                    maxLength={6}
                    placeholder="123456"
                    required
                    value={code}
                    onChange={(event) => {
                      setCode(event.currentTarget.value)
                    }}
                  />

                  <Button
                    fullWidth
                    icon={null}
                    size="lg"
                    type="submit"
                    disabled={
                      isPending ||
                      code.trim().length !== 6
                    }
                  >
                    {isPending ? 'Проверяем…' : 'Войти'}
                  </Button>

                  <Button
                    className={styles.backButton}
                    decoration="bare"
                    icon={null}
                    size="sm"
                    type="button"
                    onClick={returnToEmail}
                  >
                    Указать другую почту
                  </Button>
                </form>
              )}

              {error && (
                <p
                  className={styles.error}
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className={styles.divider}>
                <span>или</span>
              </div>

              <Button
                fullWidth
                icon={null}
                size="lg"
                variant="secondary"
                disabled
              >
                Продолжить как гость
              </Button>

              <div className={styles.registrationPrompt}>
                <span>Нет аккаунта?</span>
                <span
                  className={styles.inactiveLink}
                  aria-disabled="true"
                >
                  Создать аккаунт
                </span>
              </div>
            </div>
          </section>
        </div>
      </Panel>
    </main>
  )
}
