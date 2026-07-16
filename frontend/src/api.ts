import type { SurveyResult } from './surveys/surveyTypes'

// Адрес бэкенда. Если бэкенд на другой машине — поменяй здесь
// и добавь адрес фронтенда в CORS_ALLOWED_ORIGINS на бэке.
const API_BASE_URL = 'http://127.0.0.1:8000'

export type Submission = {
  id: number
  survey_id: string
  player_name: string
  character_name: string
  answers: Record<string, number>
  created_at: string
}

export async function sendSurveyResult(
  result: SurveyResult,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/submissions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      survey_id: result.surveyId,
      player_name: result.playerName,
      character_name: result.characterName,
      answers: result.answers,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Не удалось сохранить результат: HTTP ${response.status}`,
    )
  }
}

export async function fetchSubmissions(): Promise<Submission[]> {
  const response = await fetch(`${API_BASE_URL}/api/submissions/`)

  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить результаты: HTTP ${response.status}`,
    )
  }

  return response.json() as Promise<Submission[]>
}
