// Проверка действий в реальном Chromium: отдельное хранилище, HTTP-фикстуры и настоящие жесты мыши.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { chooseCombobox } from './choose-combobox.mjs'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v2'
const entities = [
  { id: 'entity-note', slug: 'note', entityType: 'note', name: 'Секрет картографа', description: 'Ключ к библиотеке хранится в северной башне.', facts: '', state: '' },
  { id: 'entity-quest', slug: 'quest', entityType: 'quest', name: 'Вернуть реликвию', description: 'Отыскать следы пропавшего каравана.', facts: '', state: '' },
  { id: 'entity-tower', slug: 'tower', entityType: 'location', name: 'Башня северной стражи', description: 'Здесь начинается подземный ход.', facts: '', state: '' },
]
const initial = {
  version: 3, activeId: 'interactions', entities,
  layout: { libraryWidth: 336, inspectorWidth: 380, section: 'creature', query: '' },
  diagrams: [{ id: 'interactions', name: 'Проверка действий', viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [
      { id: 'note', type: 'note', position: { x: 90, y: 90 }, data: { entityId: 'entity-note' } },
      { id: 'quest', type: 'entity', position: { x: 500, y: 90 }, data: { entityId: 'entity-quest' } },
      { id: 'tower', type: 'location', position: { x: 90, y: 480 }, data: { entityId: 'entity-tower' } },
    ],
    edges: [{ id: 'note-quest', source: 'note', target: 'quest', label: 'Ведёт к' }],
  }],
}
const entries = [
  { id: 41, entity_type: 'creature', name: 'Призрак', name_en: 'Ghost', slug: 'ghost', summary: { challenge_rating: '4', size: 'Средний', creature_type: 'Нежить' } },
  { id: 42, entity_type: 'creature', name: 'Скелет', name_en: 'Skeleton', slug: 'skeleton', summary: { challenge_rating: '1/4', creature_type: 'Нежить' } },
  { id: 43, entity_type: 'spell', name: 'Луч', name_en: 'Ray', slug: 'ray', summary: { level: 1, school: 'Эвокация' } },
  { id: 44, entity_type: 'item', name: 'Реликвия', name_en: 'Relic', slug: 'relic', summary: { rarity: 'Редкий' } },
]
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } })
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'campaign-interactions-test'))
await page.route('**/api/**', route => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (url.pathname === '/api/encyclopedia/') {
    const query = (url.searchParams.get('q') || '').toLowerCase()
    const results = entries.filter(entry => entry.entity_type === url.searchParams.get('type') && entry.name.toLowerCase().includes(query))
    return route.fulfill({ json: { count: results.length, results } })
  }
  const entry = entries.find(item => url.pathname === `/api/encyclopedia/${item.id}/`)
  if (entry) return route.fulfill({ json: { ...entry, data: entry.summary, content_html: '<p>Описание оригинала.</p>' } })
  return route.fulfill({ json: { count: 0, results: [] } })
})

const node = id => page.locator(`.react-flow__node[data-id="${id}"]`)
async function saved() { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey) }
async function closePanel() {
  for (const name of ['Закрыть Inspector', 'Закрыть карточку']) {
    const close = page.getByRole('button', { name, exact: true })
    if (await close.count()) await close.click()
  }
}
async function settle(locator) {
  await locator.evaluate(element => Promise.all(element.getAnimations({ subtree: true })
    .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
    .map(animation => animation.finished.catch(() => {}))))
}
async function noMotion(locator) {
  const animations = await locator.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running' && (Number(animation.effect?.getTiming().duration) > 1 || animation.effect?.getTiming().iterations === Infinity))
    .map(animation => ({ name: animation.animationName, timing: animation.effect.getTiming() })))
  assert.deepEqual(animations, [], 'При reduced-motion движения отключены')
}
async function quietButton(button) {
  assert.notEqual(await button.getAttribute('data-decoration'), 'ornate', `Обычное действие ${await button.innerText()} использует спокойное оформление`)
  assert.equal(await button.locator('[data-button-corner-shapes], [data-button-inner-frame]').count(), 0)
  assert.equal(await button.evaluate(element => getComputedStyle(element).filter.includes('drop-shadow')), false, 'У обычного действия нет постоянного свечения')
  assert.ok((await button.boundingBox()).height <= 36, 'Кнопка инструмента остаётся компактной')
}
async function startConnection() {
  await node('note').hover()
  await node('note').getByRole('button', { name: /^Соединить справа:/ }).click()
  await page.getByRole('status').filter({ hasText: 'Выберите второй узел' }).waitFor()
}
async function dragFromLibrary(name, target) {
  const source = page.getByRole('button', { name: `Открыть: ${name}`, exact: true })
  const origin = await source.boundingBox()
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2)
  await page.mouse.down()
  await page.mouse.move(origin.x + origin.width / 2 - 12, origin.y + origin.height / 2, { steps: 4 })
  await page.mouse.move(target.x, target.y, { steps: 16 })
  // Chromium отправляет dragover только после следующего движения указателя.
  await page.mouse.move(target.x + 1, target.y + 1)
}

try {
  await page.goto(`${baseUrl}/my-table`)
  await page.evaluate(({ key, initial }) => localStorage.setItem(key, JSON.stringify(initial)), { key: storageKey, initial })
  await page.reload()
  await node('note').waitFor()
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).waitFor()

  for (const button of [
    page.getByRole('button', { name: 'Закрытый', exact: true }),
    page.getByRole('button', { name: 'Публичный', exact: true }),
    page.getByRole('button', { name: 'Выбрать схему: Проверка действий', exact: true }),
    page.getByRole('button', { name: 'Показать всё', exact: true }),
    page.getByRole('button', { name: 'Свернуть библиотеку', exact: true }),
  ]) await quietButton(button)
  assert.equal(await page.getByRole('button', { name: 'Закрытый', exact: true }).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.getByRole('button', { name: 'Публичный', exact: true }).getAttribute('aria-pressed'), 'false')

  // В небольшом фиксированном списке нет свободного ввода; клавиатура выбирает реальную опцию.
  const section = page.getByRole('combobox', { name: 'Раздел библиотеки', exact: true })
  assert.equal(await section.evaluate(element => element.tagName), 'BUTTON')
  await section.click()
  assert.equal(await page.getByRole('option').count(), 3)
  for (const name of ['Бестиарий', 'Заклинания', 'Магические предметы']) assert.equal(await page.getByRole('option', { name, exact: true }).count(), 1)
  await section.press('End')
  await section.press('Enter')
  await page.getByRole('button', { name: 'Открыть: Реликвия', exact: true }).waitFor()
  assert.equal((await saved()).layout.section, 'item')
  await section.click()
  await section.press('Home')
  await section.press('Escape')
  assert.equal((await saved()).layout.section, 'item', 'Escape закрывает список без изменения выбранного раздела')
  assert.equal(await section.evaluate(element => element === document.activeElement), true, 'После Escape фокус возвращается в Select')
  // В таблице клавиш Playwright нет кириллицы; событие остаётся обычным keydown контрола.
  await section.dispatchEvent('keydown', { key: 'б' })
  assert.equal((await saved()).layout.section, 'creature', 'Typeahead закрытого Select выбирает существующий раздел')
  await chooseCombobox(page, 'Раздел библиотеки', 'Бестиарий')
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).waitFor()

  await node('note').getByRole('heading').click()
  const entityPanel = page.getByRole('complementary', { name: 'Wiki-карточка объекта', exact: true })
  assert.ok(await entityPanel.getAttribute('data-campaign-panel'))
  await settle(entityPanel)
  assert.ok((await entityPanel.boundingBox()).width >= 300)
  await page.screenshot({ path: join(tmpdir(), 'campaign-interactions-entity-panel.png') })
  await closePanel()

  // Поиск остаётся у больших справочников: начало и конец связи — редактируемые Combobox.
  await page.locator('.react-flow__edge[data-id="note-quest"]').click()
  const edgePanel = page.getByRole('complementary', { name: 'Карточка и редактор', exact: true })
  assert.ok(await edgePanel.getAttribute('data-campaign-panel'))
  const destination = page.getByRole('combobox', { name: 'Конец связи', exact: true })
  assert.equal(await destination.evaluate(element => element.tagName), 'INPUT')
  await destination.click()
  await destination.fill('северной')
  assert.deepEqual(await page.getByRole('option').allTextContents(), ['Башня северной стражи'])
  await destination.press('Escape')
  assert.equal((await saved()).diagrams[0].edges[0].target, 'quest', 'Поиск сам по себе не меняет адрес связи')
  await settle(edgePanel)
  await page.screenshot({ path: join(tmpdir(), 'campaign-interactions-edge-panel.png') })
  await closePanel()

  const canvas = await page.locator('.react-flow__pane').boundingBox()
  const dropPoint = { x: canvas.x + 520, y: canvas.y + 570 }
  await dragFromLibrary('Призрак', dropPoint)
  const preview = page.locator('[data-library-drag-preview]')
  await preview.waitFor()
  assert.match(await preview.innerText(), /Призрак/)
  assert.equal(await preview.getAttribute('data-over-canvas'), 'true')
  assert.equal(await page.locator('[data-library-drop-zone="true"]').count(), 1, 'Холст показывает принимающую область')
  assert.equal(await preview.evaluate(element => getComputedStyle(element).pointerEvents), 'none', 'Превью не перехватывает drop')
  assert.equal((await saved()).diagrams[0].nodes.length, 3, 'Перетаскивание до drop не создаёт размещение')
  await page.screenshot({ path: join(tmpdir(), 'campaign-library-drag-preview.png') })
  await page.mouse.up()
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.length === 4, storageKey)
  await preview.waitFor({ state: 'detached' })
  let state = await saved()
  const placed = state.diagrams[0].nodes.find(item => !initial.diagrams[0].nodes.some(original => original.id === item.id))
  assert.deepEqual(Object.keys(placed.data), ['entityId'], 'Временное состояние анимации не попадает в документ')
  assert.equal(state.entities.find(item => item.id === placed.data.entityId).reference.entityId, '41')
  assert.ok(Math.abs(placed.position.x - 521) <= 3 && Math.abs(placed.position.y - 571) <= 3, 'Нода появляется в точке отпускания указателя')
  const article = node(placed.id).locator('article')
  assert.ok(await article.getAttribute('data-arrival-key'), 'Новое размещение получает одноразовый ключ появления')
  assert.equal(await article.evaluate(element => element.getAnimations().some(animation => animation.playState === 'running'
    && animation.effect.getKeyframes().some(frame => Number(frame.opacity) < 1))), true, 'Появление ноды анимируется')
  await settle(article)
  await node(placed.id).getByRole('heading', { name: 'Призрак', exact: true }).waitFor()
  await page.screenshot({ path: join(tmpdir(), 'campaign-library-drop-result.png') })

  // В режиме связи цель выделяется целиком: ни видимых, ни фокусируемых точек на ней нет.
  await startConnection()
  await node('quest').hover()
  assert.equal(await node('quest').locator('article').getAttribute('data-connecting'), 'true')
  for (const id of ['note', 'quest', 'tower']) {
    assert.equal(await node(id).getByRole('button', { name: /^Соединить / }).count(), 0)
    assert.equal(await node(id).locator('[data-side]').count(), 0, 'Скрытая точка не остаётся в порядке Tab')
  }
  await node('tower').hover()
  assert.equal(await page.locator('[data-connection-preview] circle').count(), 1,
    'При наведении на цель остаётся только точка источника; на цели нет декоративной точки')
  await page.screenshot({ path: join(tmpdir(), 'campaign-link-target-body.png') })
  await node('tower').getByRole('heading').click()
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).diagrams[0].edges.length === 2, storageKey)
  state = await saved()
  assert.equal(state.diagrams[0].edges.at(-1).source, 'note')
  assert.equal(state.diagrams[0].edges.at(-1).target, 'tower')
  assert.equal(await node('quest').getByRole('button', { name: /^Соединить / }).count(), 4, 'После соединения обычные действия восстановлены')
  await page.keyboard.press('Control+z')
  assert.equal((await saved()).diagrams[0].edges.length, 1)
  await startConnection()
  await node('tower').hover()
  await page.keyboard.press('Escape')
  assert.equal((await saved()).diagrams[0].edges.length, 1)
  assert.equal(await node('tower').getByRole('button', { name: /^Соединить / }).count(), 4)

  // Снимок предыдущей обычной анимации не должен попадать в проверку нового reduced-motion сценария.
  await page.waitForFunction(() => !document.querySelector('[data-departing-connections]'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await startConnection()
  await node('tower').hover()
  await noMotion(page.locator('.react-flow'))
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('[data-departing-connections]').count(), 0)
  await dragFromLibrary('Скелет', { x: canvas.x + 790, y: canvas.y + 580 })
  await preview.waitFor()
  await noMotion(preview)
  await page.mouse.up()
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.length === 5, storageKey)
  state = await saved()
  const skeletonEntity = state.entities.find(item => item.reference?.entityId === '42')
  const skeletonNode = state.diagrams[0].nodes.find(item => item.data.entityId === skeletonEntity.id)
  await noMotion(node(skeletonNode.id))
  assert.deepEqual(errors, [])
  console.log('Действия карты: спокойные кнопки/панели, Select и поиск, DnD preview/landing, связь по телу цели без точек, Escape и reduced-motion — OK.')
} catch (error) {
  await page.mouse.up().catch(() => {})
  await page.screenshot({ path: join(tmpdir(), 'campaign-interactions-failure.png'), fullPage: true })
  console.error('Browser errors:', errors)
  throw error
} finally { await browser.close() }
