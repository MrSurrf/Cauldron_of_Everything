import { useState } from 'react'
import StartPage from './pages/StartPage'
import SurveyPage from './pages/SurveyPage'
import FinalPage from './pages/FinalPage'
import LoginPage from './pages/LoginPage'
import { zeroSessionSurvey } from './surveys/zeroSessionSurvey'
import { sendSurveyResult } from './api'
import { getAccessToken } from './auth'
import type { SurveyResult } from './surveys/surveyTypes'
import GmResultsPage from './pages/GmResultsPage'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    Boolean(getAccessToken()),
  )
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [characterName, setCharacterName] = useState<string>('')
  const [result, setResult] = useState<SurveyResult | null>(null)

  const isGmResultsPage = window.location.hash === '#/gm'

  if (isGmResultsPage) {
    return <GmResultsPage />
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />
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
    return <FinalPage />
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
