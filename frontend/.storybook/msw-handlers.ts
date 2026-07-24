import { HttpResponse, http } from 'msw'

const submissions = [
  {
    id: 1,
    survey_id: 'zero-session',
    player_name: 'Анна',
    character_name: 'Лиара',
    answers: {
      engagement: 4,
      mechanic: 2,
      seriousness: -1,
      romance: 0,
      violence: -3,
      lore: 5,
      sandbox: 3,
      horror: -2,
      partyConflict: -4,
      characterDeath: 1,
      discrimination: -5,
    },
    created_at: '2026-07-20T18:30:00+03:00',
  },
  {
    id: 2,
    survey_id: 'zero-session',
    player_name: 'Михаил',
    character_name: '',
    answers: {
      engagement: 2,
      mechanic: 5,
      seriousness: 3,
      romance: -2,
      violence: 0,
      lore: 4,
      sandbox: 1,
      horror: -4,
      partyConflict: -3,
      characterDeath: -1,
      discrimination: -5,
    },
    created_at: '2026-07-21T20:15:00+03:00',
  },
]

export const mswHandlers = {
  submissions: [
    http.get(
      'http://127.0.0.1:8000/api/submissions/',
      () => HttpResponse.json(submissions),
    ),
  ],
}
