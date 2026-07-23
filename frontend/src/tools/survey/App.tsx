import { useState } from 'react'
import StartPage from './pages/StartPage'
import SurveyPage from './pages/SurveyPage'
import { zeroSessionSurvey } from './surveys/zeroSessionSurvey'
import { sendSurveyResult } from './api'
import type { SurveyResult } from './surveys/surveyTypes'
import GmResultsPage from './pages/GmResultsPage'

function App() {
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [characterName, setCharacterName] = useState<string>('')
  const [result, setResult] = useState<SurveyResult | null>(null)

  const isGmResultsPage = window.location.hash === '#/gm'

  if (isGmResultsPage) {
    return <GmResultsPage />
  }

  function handleStart(name: string, character: string) {
    setPlayerName(name)
    setCharacterName(character)
  }

  function handleComplete(surveyResult: SurveyResult) {
    setResult(surveyResult)
    sendSurveyResult(surveyResult).catch((error) => {
      console.error('Не удалось сохранить результат', error)
    })
  }

  if (!playerName) {
    return <StartPage onStart={handleStart} />
  }

  if (result) {
    return (
      <main>
        <h1>Опрос завершён</h1>

        <p>Участник: {result.playerName}</p>

        {result.characterName && (
          <p>Персонаж: {result.characterName}</p>
        )}

        {zeroSessionSurvey.questions.map((question) => (
          <section key={question.id}>
            <h2>{question.title}</h2>
            <p>
              Выбранное значение: {result.answers[question.id]}
            </p>
          </section>
        ))}
      </main>
    )
  }

  return (
    <SurveyPage
      playerName={playerName}
      characterName={characterName}
      config={zeroSessionSurvey}
      onComplete={handleComplete}
    />
  )
}

export default App
