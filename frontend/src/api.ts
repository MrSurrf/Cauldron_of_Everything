import type { SurveyResult } from './surveys/surveyTypes'

// Адрес бэкенда. Если бэкенд на другой машине — поменяй здесь
// и добавь адрес фронтенда в CORS_ALLOWED_ORIGINS на бэке.
const API_BASE_URL = 'http://127.0.0.1:8000'

export async function sendSurveyResult(
  result: SurveyResult,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/submissions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      survey_id: result.surveyId,
      player_name: result.playerName,
      answers: result.answers,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Не удалось сохранить результат: HTTP ${response.status}`,
    )
  }
}
