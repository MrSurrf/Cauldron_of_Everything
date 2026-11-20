import type { EncyclopediaClassDetail } from '../model/classEntity'

// Короткие синтетические данные: проверяют структуру, не воспроизводят правила или статьи.
const seekerLevels = Array.from({ length: 20 }, (_, index) => {
  const level = index + 1
  const feature = level === 3 ? '<a href="#horizon-step">Шаг горизонта</a>' : `Учебное умение ${level}`
  return `<tr><td>${level}</td><td>+${2 + Math.floor(index / 4)}</td><td>${feature}</td><td>${Math.min(level, 4)}</td><td>${level > 2 ? 2 : '—'}</td><td>${level > 4 ? 1 : '—'}</td></tr>`
}).join('')

export const seekerClassDetail: EncyclopediaClassDetail = {
  id: 7101,
  entity_type: 'class',
  slug: 'synthetic-seeker',
  name: 'Искатель',
  name_en: 'Seeker',
  sources: ['Синтетический тестовый набор'],
  data: { hit_die: '1к6' },
  content_text: 'Синтетический класс для проверки таблиц, оглавления и вложенных разделов.',
  content_html: `
    <p>Искатель — синтетический класс для проверки интерфейса. Это не игровые правила.</p>
    <h2 id="seeker-progression">Развитие Искателя</h2>
    <table>
      <caption>Таблица развития Искателя</caption>
      <thead><tr><th rowspan="2">Уровень</th><th rowspan="2">Бонус мастерства</th><th rowspan="2">Умения</th><th colspan="3">Ячейки заклинаний</th></tr>
      <tr><th>1-й уровень</th><th>2-й уровень</th><th>3-й уровень</th></tr></thead>
      <tbody>${seekerLevels}</tbody>
    </table>
    <h2 id="class-features">Умения класса</h2>
    <p>Ниже находятся только тестовые описания.</p>
    <h3 id="basic-focus">Базовая концентрация</h3>
    <p>Первая синтетическая особенность с <strong>выделенным текстом</strong>.</p>
    <h3 id="traditions">Пути искателей</h3>
    <p>Раздел для проверки вложенного оглавления.</p>
    <h4 id="path-horizon">Путь горизонта</h4>
    <p>Синтетический подкласс без заимствованного описания.</p>
    <h5 id="horizon-step">Шаг горизонта</h5>
    <p>Вложенная тестовая особенность, доступная из таблицы развития.</p>
    <h4 id="path-lantern">Путь фонаря</h4>
    <p>Второй тестовый подраздел.</p>
  `,
}

const keeperLevels = Array.from({ length: 20 }, (_, index) => {
  const level = index + 1
  return `<tr><td>${level}</td><td>+${2 + Math.floor(index / 4)}</td><td>${level === 2 ? '<a href="#border-watch">Дозор рубежа</a>' : `Подготовка ${level}`}</td><td>${Math.ceil(level / 4)}</td></tr>`
}).join('')

export const borderKeeperClassDetail: EncyclopediaClassDetail = {
  id: 7102,
  entity_type: 'class',
  slug: 'synthetic-border-keeper',
  name: 'Страж рубежа',
  name_en: 'Border Keeper',
  sources: ['Синтетический тестовый набор'],
  data: { hit_die: '1к10' },
  content_html: `
    <p>Страж рубежа — второй синтетический класс, не использующий заклинания.</p>
    <h2 id="keeper-progression">Развитие Стража</h2>
    <table><thead><tr><th>Уровень</th><th>Бонус мастерства</th><th>Умения</th><th>Запас стойкости</th></tr></thead><tbody>${keeperLevels}</tbody></table>
    <h2 id="keeper-features">Умения стража</h2>
    <h3 id="border-watch">Дозор рубежа</h3>
    <p>Тестовая особенность второго класса.</p>
  `,
}

export const fallbackClassDetail: EncyclopediaClassDetail = {
  id: 7103,
  entity_type: 'class',
  slug: 'synthetic-text-class',
  name: 'Текстовый класс',
  name_en: 'Text Class',
  sources: [],
  data: {},
  content_html: '',
  content_text: 'Синтетическое текстовое описание класса без HTML.\nПроверка запасного представления.',
}

export const unsafeClassDetail: EncyclopediaClassDetail = {
  ...fallbackClassDetail,
  id: 7104,
  slug: 'synthetic-unsafe-class',
  name: 'Безопасное представление',
  content_html: `<p>Безопасный тестовый текст.</p>
    <script>globalThis.__classUnsafeExecuted = true</script>
    <img src="invalid-class-fixture" onerror="globalThis.__classUnsafeExecuted = true">
    <iframe srcdoc="<script>parent.__classUnsafeExecuted = true</script>"></iframe>
    <h2 id="safe-feature">Проверка очистки</h2>
    <p onclick="globalThis.__classUnsafeExecuted = true"><a href="javascript:globalThis.__classUnsafeExecuted=true">Опасная ссылка</a> остаётся безопасным текстом.</p>`,
}
