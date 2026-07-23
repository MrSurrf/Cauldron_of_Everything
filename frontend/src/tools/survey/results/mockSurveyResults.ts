export const resultCategories = [
  {
    id: 'engagement',
    title: 'Вовлечённость',
    leftLabel: 'Наблюдаю со стороны',
    rightLabel: 'Активно двигаю игру',
  },
  {
    id: 'mechanic',
    title: 'Механики и правила',
    leftLabel: 'Правила не важны',
    rightLabel: 'Люблю разбираться в механиках',
  },
  {
    id: 'seriousness',
    title: 'Серьёзность игры',
    leftLabel: 'Лёгкая и шуточная игра',
    rightLabel: 'Серьёзная драматичная история',
  },
  {
    id: 'romance',
    title: 'Романтические линии',
    leftLabel: 'Не интересуют',
    rightLabel: 'Хочу видеть в игре',
  },
  {
    id: 'violence',
    title: 'Жестокость',
    leftLabel: 'Без тяжёлых сцен',
    rightLabel: 'Мрачная и жестокая игра',
  },
  {
    id: 'lore',
    title: 'Погружение в лор',
    leftLabel: 'Только необходимое',
    rightLabel: 'Хочу изучать мир',
  },
  {
    id: 'sandbox',
    title: 'Сюжет и песочница',
    leftLabel: 'Чёткий сюжет',
    rightLabel: 'Свободная песочница',
  },
  {
    id: 'horror',
    title: 'Хоррор',
    leftLabel: 'Без страшных сцен',
    rightLabel: 'Полноценный хоррор',
  },
  {
    id: 'partyConflict',
    title: 'Конфликты внутри группы',
    leftLabel: 'Полное единство',
    rightLabel: 'Допустимы серьёзные конфликты',
  },
  {
    id: 'characterDeath',
    title: 'Смерть персонажа',
    leftLabel: 'Персонаж должен выжить',
    rightLabel: 'Смерть является частью игры',
  },
  {
    id: 'discrimination',
    title: 'Дискриминация в игровом мире',
    leftLabel: 'Не использовать',
    rightLabel: 'Допустимо как часть сеттинга',
  },
] as const

export type ResultCategoryId =
  typeof resultCategories[number]['id']

export type MockPlayerResult = {
  id: string
  playerName: string
  characterName: string
  completedAt: string
  answers: Record<ResultCategoryId, number>
}

export const mockPlayerResults: MockPlayerResult[] = [
  {
    id: 'player-1',
    playerName: 'Алексей',
    characterName: 'Моргрим Темнейший',
    completedAt: '2026-07-16T12:25:00',
    answers: {
      engagement: 4,
      mechanic: 2,
      seriousness: 5,
      romance: -2,
      violence: 3,
      lore: 5,
      sandbox: 1,
      horror: 2,
      partyConflict: -1,
      characterDeath: 3,
      discrimination: 0,
    },
  },
  {
    id: 'player-2',
    playerName: 'Катя',
    characterName: 'Мелисса',
    completedAt: '2026-07-16T12:42:00',
    answers: {
      engagement: 5,
      mechanic: -1,
      seriousness: 4,
      romance: 3,
      violence: 0,
      lore: 4,
      sandbox: -2,
      horror: -3,
      partyConflict: 2,
      characterDeath: -1,
      discrimination: -2,
    },
  },
  {
    id: 'player-3',
    playerName: 'Рома',
    characterName: 'Эйвар Хегнар',
    completedAt: '2026-07-16T13:10:00',
    answers: {
      engagement: 2,
      mechanic: 5,
      seriousness: 1,
      romance: -5,
      violence: 4,
      lore: 0,
      sandbox: 5,
      horror: 3,
      partyConflict: 4,
      characterDeath: 5,
      discrimination: 1,
    },
  },
  {
    id: 'player-4',
    playerName: 'Валера',
    characterName: 'Марцеллиан',
    completedAt: '2026-07-16T13:26:00',
    answers: {
      engagement: 3,
      mechanic: 0,
      seriousness: 3,
      romance: 4,
      violence: -2,
      lore: 5,
      sandbox: 0,
      horror: -1,
      partyConflict: -3,
      characterDeath: 1,
      discrimination: -4,
    },
  },
  {
    id: 'player-5',
    playerName: 'Евгениус Пятый Великий',
    characterName: 'Сэр Жопослав',
    completedAt: '2026-07-16T13:51:00',
    answers: {
      engagement: -1,
      mechanic: 4,
      seriousness: 0,
      romance: -4,
      violence: 5,
      lore: 1,
      sandbox: 4,
      horror: 5,
      partyConflict: 3,
      characterDeath: 4,
      discrimination: 2,
    },
  },
]