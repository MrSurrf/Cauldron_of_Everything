import type { SurveyResult } from './surveys/surveyTypes'
import { authFetch } from './auth'
import {
  clearResourceCache,
  dedupeResourceRequest,
  readResourceCache,
} from '../../shared/api/resourceCache'

// Адрес бэкенда. В продакшене задаётся через VITE_API_BASE_URL
// при сборке (например, в Dokploy). Для локальной разработки — localhost:8000.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export type Submission = {
  id: number
  survey_id: string
  player_name: string
  character_name: string
  answers: Record<string, number>
  created_at: string
}

const SUBMISSIONS_CACHE_KEY = 'survey.submissions'

// Сохранённый список результатов для мгновенного показа страницы мастера.
export function readCachedSubmissions(): Submission[] | null {
  const cached = readResourceCache<Submission[]>(SUBMISSIONS_CACHE_KEY)
  return Array.isArray(cached) ? cached : null
}

export function clearSubmissionsCache(): void {
  clearResourceCache(SUBMISSIONS_CACHE_KEY)
}

export async function sendSurveyResult(
  result: SurveyResult,
): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/api/submissions/`, {
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

  // Новый результат должен попасть в список при следующей загрузке.
  clearSubmissionsCache()
}

export async function fetchSubmissions(): Promise<Submission[]> {
  return dedupeResourceRequest(
    SUBMISSIONS_CACHE_KEY,
    fetchSubmissionsFromServer,
  )
}

async function fetchSubmissionsFromServer(): Promise<Submission[]> {
  const response = await authFetch(`${API_BASE_URL}/api/submissions/`)

  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить результаты: HTTP ${response.status}`,
    )
  }

  return response.json() as Promise<Submission[]>
}
