import { useState } from 'react'
import StartPage from './pages/StartPage'
import SurveyPage from './pages/SurveyPage'
import { zeroSessionSurvey } from './surveys/zeroSessionSurvey'
import type { SurveyResult } from './surveys/surveyTypes'
import GmResultsPage from './pages/GmResultsPage'

function App() {
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [result, setResult] = useState<SurveyResult | null>(null)
  const isGmResultsPage =
  window.location.hash === '#/gm'

if (isGmResultsPage) {
  return <GmResultsPage />
}

  if (!playerName) {
    return <StartPage onStart={setPlayerName} />
  }

  if (result) {
    return (
      <main>
        <h1>Опрос завершён</h1>

        <p>Участник: {result.playerName}</p>

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
      config={zeroSessionSurvey}
      onComplete={setResult}
    />
  )
}

export default App