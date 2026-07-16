import { useState, type FormEvent } from 'react'
import './StartPage.css'

type StartPageProps = {
  onStart: (name: string) => void
}

function StartPage({ onStart }: StartPageProps) {
  const [name, setName] = useState('')

  const preparedName = name.trim()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!preparedName) {
      return
    }

    onStart(preparedName)
  }

  return (
    <main className="start-page gilroy">
      <div className="start-page__scene">
        <img
          className="start-page__head"
          src="/start/head.png"
          alt=""
          aria-hidden="true"
        />

        <img
          className="start-page__hand start-page__hand--left"
          src="/start/left-hand.png"
          alt=""
          aria-hidden="true"
        />

        <img
          className="start-page__hand start-page__hand--right"
          src="/start/right-hand.png"
          alt=""
          aria-hidden="true"
        />

        <form
          className="start-page__form"
          onSubmit={handleSubmit}
        >
          <label
            className="start-page__label"
            htmlFor="player-name"
          >
            Введите ваше имя
          </label>

          <div className="start-page__input-frame">
            <input
              id="player-name"
              className="start-page__input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Имя"
              autoComplete="name"
              maxLength={50}
              autoFocus
            />
          </div>

          <button
            className="start-page__submit"
            type="submit"
            disabled={!preparedName}
          >
            Начать опрос
          </button>
        </form>
      </div>
    </main>
  )
}

export default StartPage