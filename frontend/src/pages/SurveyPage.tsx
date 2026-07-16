import {
  useState,
  type CSSProperties,
} from 'react'

import type {
  SurveyAnswers,
  SurveyConfig,
  SurveyResult,
} from '../surveys/surveyTypes'

import './SurveyPage.css'

type SurveyPageProps = {
  playerName: string
  characterName: string
  config: SurveyConfig
  onComplete: (result: SurveyResult) => void
}

type ScaleTone =
  | 'negative-strong'
  | 'negative'
  | 'negative-soft'
  | 'neutral'
  | 'positive-soft'
  | 'positive'
  | 'positive-strong'
  | 'idle'

function getScaleTone(
  value: number | undefined,
): ScaleTone {
  if (value === undefined) {
    return 'idle'
  }

  if (value <= -4) {
    return 'negative-strong'
  }

  if (value <= -2) {
    return 'negative'
  }

  if (value === -1) {
    return 'negative-soft'
  }

  if (value === 0) {
    return 'neutral'
  }

  if (value <= 2) {
    return 'positive-soft'
  }

  if (value <= 4) {
    return 'positive'
  }

  return 'positive-strong'
}

function SurveyPage({
  playerName,
  characterName,
  config,
  onComplete,
}: SurveyPageProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0)

  const [answers, setAnswers] =
    useState<SurveyAnswers>({})

  const [previewValue, setPreviewValue] =
    useState<number | null>(null)

  const currentQuestion =
    config.questions[currentQuestionIndex]

  const selectedValue =
    answers[currentQuestion.id]

  const displayedValue =
    previewValue ?? selectedValue

  const hasSelectedAnswer =
    selectedValue !== undefined

  const isFirstQuestion =
    currentQuestionIndex === 0

  const isLastQuestion =
    currentQuestionIndex ===
    config.questions.length - 1

  const displayedTone =
    getScaleTone(displayedValue)

  const illustrations =
    currentQuestion.illustrations ?? []

  const activeIllustrationIndex =
    displayedValue === undefined
      ? -1
      : illustrations.findIndex(
          (illustration) =>
            illustration.values.includes(
              displayedValue,
            ),
        )

  const activeIllustrationPosition =
    activeIllustrationIndex >= 0 &&
    illustrations.length > 1
      ? (
          activeIllustrationIndex /
          (illustrations.length - 1)
        ) * 100
      : 50

  const illustrationPanelStyle = {
    '--active-position':
      `${activeIllustrationPosition}%`,
  } as CSSProperties

  const displayedDescription =
    displayedValue === undefined
      ? 'Наведи курсор на вариант ответа.'
      : currentQuestion.descriptions[
          displayedValue
        ] ??
        'Для этого значения пока нет описания.'

  function handleSelect(value: number) {
    setPreviewValue(value)

    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentQuestion.id]: value,
    }))
  }

  function handleBack() {
    if (isFirstQuestion) {
      return
    }

    setPreviewValue(null)

    setCurrentQuestionIndex(
      (previousIndex) => previousIndex - 1,
    )
  }

  function handleNext() {
    if (!hasSelectedAnswer) {
      return
    }

    if (isLastQuestion) {
      onComplete({
        surveyId: config.id,
        playerName,
        characterName,
        answers,
      })

      return
    }

    setPreviewValue(null)

    setCurrentQuestionIndex(
      (previousIndex) => previousIndex + 1,
    )
  }

  return (
    <main className="survey-page">
      <div className="survey-page__overlay" />

      <section className="survey-shell">
        <div className="survey-meta">
          <span>{playerName}</span>

          <span>
            {currentQuestionIndex + 1}
            {' / '}
            {config.questions.length}
          </span>
        </div>

<header className="survey-heading">
  <h1 className="survey-heading__title">
    {currentQuestion.title}
  </h1>

  <p className="survey-heading__subtitle">
    {currentQuestion.subtitle}
  </p>
</header>

        {illustrations.length > 0 && (
          <div
            className="survey-illustration-panel"
            data-tone={displayedTone}
            style={illustrationPanelStyle}
          >
            <div className="survey-illustrations">
              {illustrations.map(
                (
                  illustration,
                  illustrationIndex,
                ) => {
                  const isActive =
                    displayedValue !== undefined &&
                    illustration.values.includes(
                      displayedValue,
                    )

                  return (
                    <div
                      key={illustration.src}
                      className={
                        isActive
                          ? 'survey-illustration survey-illustration--active'
                          : 'survey-illustration'
                      }
                      style={
                        {
                          '--illustration-index':
                            illustrationIndex,
                        } as CSSProperties
                      }
                    >
                      <img
                        src={illustration.src}
                        alt={illustration.alt}
                      />
                    </div>
                  )
                },
              )}
            </div>
          </div>
        )}

        <div
          className="survey-description"
          data-tone={displayedTone}
        >
          <p>{displayedDescription}</p>
        </div>

        <div className="survey-scale">
          {config.scale.map((option) => {
            const isSelected =
              selectedValue === option.value

            const isPreviewed =
              previewValue === option.value

            const optionTone =
              getScaleTone(option.value)

            const buttonClassName = [
              'survey-scale__button',
              isSelected
                ? 'survey-scale__button--selected'
                : '',
              isPreviewed
                ? 'survey-scale__button--hovered'
                : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
  key={option.value}
  type="button"
  className={buttonClassName}
  data-tone={optionTone}
  data-value={option.value}
  onClick={() => handleSelect(option.value)}
  onMouseEnter={() => setPreviewValue(option.value)}
  onFocus={() => setPreviewValue(option.value)}
  aria-pressed={isSelected}
>
  <span
    className="survey-scale__inner-frame"
    aria-hidden="true"
  />

  <span
    className="survey-scale__surface"
    aria-hidden="true"
  />

  <span className="survey-scale__value">
    {option.label}
  </span>
</button>
            )
          })}
        </div>

        <footer className="survey-navigation">
          <button
            className="survey-navigation__button"
            type="button"
            onClick={handleBack}
            disabled={isFirstQuestion}
          >
            Назад
          </button>

          <button
            className="survey-navigation__button survey-navigation__button--primary"
            type="button"
            onClick={handleNext}
            disabled={!hasSelectedAnswer}
          >
            {isLastQuestion
              ? 'Завершить'
              : 'Далее'}
          </button>
        </footer>
      </section>
    </main>
  )
}

export default SurveyPage