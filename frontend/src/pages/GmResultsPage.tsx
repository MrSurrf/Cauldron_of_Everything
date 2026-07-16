import {
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  mockPlayerResults,
  resultCategories,
  type MockPlayerResult,
} from '../results/mockSurveyResults'

import './GmResultsPage.css'

const GM_DEMO_PASSWORD = 'gm-demo'

const SCALE_VALUES = [
  -5,
  -4,
  -3,
  -2,
  -1,
  0,
  1,
  2,
  3,
  4,
  5,
] as const

type ScaleTone =
  | 'negative'
  | 'neutral'
  | 'positive'

function getScaleTone(
  value: number,
): ScaleTone {
  if (value < 0) {
    return 'negative'
  }

  if (value > 0) {
    return 'positive'
  }

  return 'neutral'
}

function formatCompletedAt(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'ru-RU',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(new Date(value))
}

function GmResultsPage() {
  const [isAuthorized, setIsAuthorized] =
    useState(
      () =>
        sessionStorage.getItem(
          'gm-demo-authorized',
        ) === 'true',
    )

  const [password, setPassword] =
    useState('')

  const [loginError, setLoginError] =
    useState('')

  const [selectedPlayerId, setSelectedPlayerId] =
    useState(
      mockPlayerResults[0]?.id ?? '',
    )

  const selectedPlayer = useMemo(
    () =>
      mockPlayerResults.find(
        (player) =>
          player.id === selectedPlayerId,
      ) ?? mockPlayerResults[0],
    [selectedPlayerId],
  )

  function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (password !== GM_DEMO_PASSWORD) {
      setLoginError('Неверный пароль')
      return
    }

    sessionStorage.setItem(
      'gm-demo-authorized',
      'true',
    )

    setLoginError('')
    setIsAuthorized(true)
  }

  function handleLogout() {
    sessionStorage.removeItem(
      'gm-demo-authorized',
    )

    setPassword('')
    setIsAuthorized(false)
  }

  if (!isAuthorized) {
    return (
      <main className="gm-login-page">
        <div className="gm-login-page__overlay" />

        <form
          className="gm-login"
          onSubmit={handleLogin}
        >
          <div
            className="gm-login__badge"
            aria-hidden="true"
          >
            GM
          </div>

          <p className="gm-login__eyebrow">
            Закрытый раздел
          </p>

          <h1 className="gm-login__title">
            Результаты опроса
          </h1>

          <p className="gm-login__description">
            Введите пароль мастера, чтобы
            открыть ответы игроков.
          </p>

          <label className="gm-login__field">
            <span>Пароль</span>

            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value,
                )

                if (loginError) {
                  setLoginError('')
                }
              }}
              autoComplete="current-password"
              autoFocus
            />
          </label>

          {loginError && (
            <p
              className="gm-login__error"
              role="alert"
            >
              {loginError}
            </p>
          )}

          <button
            className="gm-login__button"
            type="submit"
          >
            Войти
          </button>

          <p className="gm-login__hint">
            Тестовый пароль: gm-demo
          </p>
        </form>
      </main>
    )
  }

  if (!selectedPlayer) {
    return (
      <main className="gm-results-page">
        <p>Результаты игроков отсутствуют.</p>
      </main>
    )
  }

  return (
    <main className="gm-results-page">
      <div className="gm-results-page__overlay" />

      <div className="gm-results-layout">
        <section className="gm-results-content">
          <header className="gm-results-header">
            <div>
              <p className="gm-results-header__eyebrow">
                Результаты нулевой сессии
              </p>

              <h1 className="gm-results-header__title">
                {selectedPlayer.playerName}
              </h1>

              <p className="gm-results-header__character">
                Персонаж:{' '}
                <span>
                  {selectedPlayer.characterName}
                </span>
              </p>
            </div>

            <div className="gm-results-header__meta">
              <span>
                Заполнено
              </span>

              <time
                dateTime={
                  selectedPlayer.completedAt
                }
              >
                {formatCompletedAt(
                  selectedPlayer.completedAt,
                )}
              </time>
            </div>
          </header>

          <div className="gm-results-list">
            {resultCategories.map(
              (category) => {
                const value =
                  selectedPlayer.answers[
                    category.id
                  ]

                return (
                  <article
                    key={category.id}
                    className="gm-result-row"
                  >
                    <div className="gm-result-row__heading">
                      <h2>
                        {category.title}
                      </h2>

                      <strong
                        data-tone={getScaleTone(
                          value,
                        )}
                      >
                        {value > 0
                          ? `+${value}`
                          : value}
                      </strong>
                    </div>

                    <div className="gm-result-scale">
                      <div className="gm-result-scale__track">
                        {SCALE_VALUES.map(
                          (scaleValue) => {
                            const isActive =
                              scaleValue ===
                              value

                            return (
                              <div
                                key={
                                  scaleValue
                                }
                                className={[
                                  'gm-result-scale__cell',
                                  isActive
                                    ? 'gm-result-scale__cell--active'
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                data-tone={getScaleTone(
                                  scaleValue,
                                )}
                              >
                                <span>
                                  {scaleValue}
                                </span>
                              </div>
                            )
                          },
                        )}
                      </div>

                      <div className="gm-result-scale__labels">
                        <span>
                          {
                            category.leftLabel
                          }
                        </span>

                        <span>
                          {
                            category.rightLabel
                          }
                        </span>
                      </div>
                    </div>
                  </article>
                )
              },
            )}
          </div>
        </section>

        <aside className="gm-player-sidebar">
          <div className="gm-player-sidebar__header">
            <div>
              <p>Игроки</p>

              <span>
                {mockPlayerResults.length}{' '}
                ответов
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
            >
              Выйти
            </button>
          </div>

          <div className="gm-player-list">
            {mockPlayerResults.map(
              (
                player: MockPlayerResult,
                index,
              ) => {
                const isSelected =
                  player.id ===
                  selectedPlayer.id

                return (
                  <button
                    key={player.id}
                    type="button"
                    className={[
                      'gm-player-card',
                      isSelected
                        ? 'gm-player-card--selected'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() =>
                      setSelectedPlayerId(
                        player.id,
                      )
                    }
                    aria-pressed={isSelected}
                  >
                    <span className="gm-player-card__number">
                      {String(index + 1).padStart(
                        2,
                        '0',
                      )}
                    </span>

                    <span className="gm-player-card__content">
                      <strong>
                        {player.playerName}
                      </strong>

                      <small>
                        {player.characterName}
                      </small>
                    </span>

                    <span
                      className="gm-player-card__status"
                      aria-hidden="true"
                    />
                  </button>
                )
              },
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}

export default GmResultsPage