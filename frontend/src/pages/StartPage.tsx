import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from 'react'

import './StartPage.css'

type StartPageProps = {
  onStart: (
    playerName: string,
    characterName: string,
  ) => void
}

/*
  Сила движения фона по горизонтали.
*/
const PARALLAX_X_STRENGTH = 20

/*
  Сила движения фона по вертикали.
*/
const PARALLAX_Y_STRENGTH = 20

/*
  -1: фон движется против курсора.
   1: фон движется вслед за курсором.
*/
const PARALLAX_DIRECTION = -1

/*
  Плавность движения.

  0.03–0.05 — медленно и плавно
  0.06–0.1 — средняя скорость
  0.12–0.2 — быстрый отклик
*/
const PARALLAX_SMOOTHING = 1

function StartPage({
  onStart,
}: StartPageProps) {
  const [name, setName] = useState('')

  const sceneRef =
    useRef<HTMLDivElement>(null)

  const targetParallax = useRef({
    x: 0,
    y: 0,
  })

  const currentParallax = useRef({
    x: 0,
    y: 0,
  })

  const preparedName = name.trim()

  useEffect(() => {
    let animationFrameId = 0

    function animateParallax() {
      const scene = sceneRef.current

      if (scene) {
        const current =
          currentParallax.current

        const target =
          targetParallax.current

        current.x +=
          (target.x - current.x) *
          PARALLAX_SMOOTHING

        current.y +=
          (target.y - current.y) *
          PARALLAX_SMOOTHING

        scene.style.setProperty(
          '--parallax-x',
          `${current.x}px`,
        )

        scene.style.setProperty(
          '--parallax-y',
          `${current.y}px`,
        )
      }

      animationFrameId =
        requestAnimationFrame(
          animateParallax,
        )
    }

    animationFrameId =
      requestAnimationFrame(
        animateParallax,
      )

    return () => {
      cancelAnimationFrame(
        animationFrameId,
      )
    }
  }, [])

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (event.pointerType !== 'mouse') {
      return
    }

    const bounds =
      event.currentTarget
        .getBoundingClientRect()

    const normalizedX =
      (
        (event.clientX - bounds.left) /
          bounds.width -
        0.5
      ) * 2

    const normalizedY =
      (
        (event.clientY - bounds.top) /
          bounds.height -
        0.5
      ) * 2

    targetParallax.current.x =
      normalizedX *
      PARALLAX_X_STRENGTH *
      PARALLAX_DIRECTION

    targetParallax.current.y =
      normalizedY *
      PARALLAX_Y_STRENGTH *
      PARALLAX_DIRECTION
  }

  function handlePointerLeave() {
    targetParallax.current.x = 0
    targetParallax.current.y = 0
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!preparedName) {
      return
    }

    /*
      Поле имени персонажа сейчас отключено,
      поэтому вторым аргументом передаётся
      пустая строка.
    */
    onStart(preparedName, '')
  }

  return (
    <main className="start-page gilroy">
      <div
        ref={sceneRef}
        className="start-page__scene"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div
          className="start-page__background"
          aria-hidden="true"
        />

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
              onChange={(event) =>
                setName(event.target.value)
              }
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