export type EncyclopediaSection = {
  id: string
  title: string
  description: string
  type?: string
}

export const encyclopediaGroups: { id: string; title: string; sections: EncyclopediaSection[] }[] = [
  {
    id: 'directories', title: 'Справочники', sections: [
      { id: 'bestiary', title: 'Бестиарий', description: 'Существа, монстры и противники.', type: 'creature' },
      { id: 'classes', title: 'Классы', description: 'Классы персонажей и их особенности.', type: 'class' },
      { id: 'races', title: 'Расы', description: 'Игровые расы и их культуры.', type: 'race' },
      { id: 'backgrounds', title: 'Предыстории', description: 'Происхождение и прошлое героев.', type: 'background' },
      { id: 'feats', title: 'Черты', description: 'Отличительные особенности персонажей.', type: 'feat' },
    ],
  },
  {
    id: 'magic', title: 'Магия и предметы', sections: [
      { id: 'spells', title: 'Заклинания', description: 'Описание заклинаний, их эффекты и применение.', type: 'spell' },
      { id: 'items', title: 'Магические предметы', description: 'Артефакты, зелья, оружие и снаряжение.', type: 'item' },
    ],
  },
  {
    id: 'rules', title: 'Правила и механики', sections: [
      { id: 'formulas', title: 'Основные формулы', description: 'Ключевые проверки, броски и расчёты.' },
      { id: 'conditions', title: 'Состояния', description: 'Положительные и отрицательные состояния и эффекты.' },
      { id: 'combat', title: 'Бой', description: 'Правила сражений и тактические механики.' },
      { id: 'actions', title: 'Действия', description: 'Действия, бонусные действия и реакции.' },
      { id: 'creature-statistics', title: 'Статистика существ', description: 'Характеристики, параметры и чтение стат-блоков.' },
      { id: 'spellcasting', title: 'Использование заклинаний', description: 'Сотворение, компоненты и концентрация.' },
      { id: 'multiclassing', title: 'Мультиклассирование', description: 'Сочетание классов и развитие персонажа.' },
    ],
  },
]

export const encyclopediaSections = encyclopediaGroups.flatMap((group) => group.sections)
export const sectionPath = (section: EncyclopediaSection) => `/encyclopedia/${section.id}`
export const typeLabel = (type: string) => encyclopediaSections.find((section) => section.type === type)?.title ?? 'Энциклопедия'
