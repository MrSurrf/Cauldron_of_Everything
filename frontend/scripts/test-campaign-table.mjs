// Реальный UI, изолированный Chromium и HTTP-фикстуры; без изменений серверной БД.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { chooseCombobox } from './choose-combobox.mjs'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v2'
const entries = [
  { id: 41, entity_type: 'creature', name: 'Призрак', name_en: 'Ghost', slug: 'ghost', summary: { challenge_rating: '4', size: 'Средний', creature_type: 'Нежить' } },
  { id: 42, entity_type: 'creature', name: 'Скелет', name_en: 'Skeleton', slug: 'skeleton', summary: { challenge_rating: '1/4' } },
  ...['class', 'race', 'background', 'feat', 'spell', 'item', 'reference'].map((type, i) => ({ id: 100 + i, entity_type: type, name: `Материал ${type}`, name_en: '', slug: type, summary: { level: 1 } })),
]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } })
const errors = []
const apiRequests = []
let publicDocument
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'campaign-test-token'))
await page.route('**/api/**', async route => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  apiRequests.push(url.pathname)
  if (url.pathname === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (url.pathname === '/api/encyclopedia/') {
    const q = (url.searchParams.get('q') || '').toLowerCase()
    const results = entries.filter(entry => entry.entity_type === url.searchParams.get('type') && entry.name.toLowerCase().includes(q))
    return route.fulfill({ json: { count: results.length, results } })
  }
  const entry = entries.find(item => url.pathname === `/api/encyclopedia/${item.id}/`)
  if (entry) return route.fulfill({ json: { ...entry, content_html: '<p>Описание оригинала</p>', data: { ...entry.summary, armor_class: 13, hit_points: '45 (10к8)', speed: '30 фт., полёт 60 фт.', senses: 'Тёмное зрение 60 фт., пассивное Восприятие 12' } } })
  if (url.pathname === '/api/characters/') return route.fulfill({ json: { count: 1, results: [{ id: 'hero', entityType: 'character', name: 'Герой', slug: 'hero', facts: ['Воин'], description: 'Описание героя' }] } })
  if (url.pathname === '/api/campaigns/allowed/table/public/') return route.fulfill({ json: { visibility: 'public', document: publicDocument } })
  if (url.pathname.includes('/table/public/')) return route.fulfill({ status: 403, json: {} })
  return route.fulfill({ status: 404, json: {} })
})
async function saved() { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey) }
function entityFor(state, node) { return state.entities.find(entity => entity.id === node.data.entityId) }
async function waitForNodes(count) { await page.waitForFunction(expected => document.querySelectorAll('.react-flow__node').length === expected, count) }
async function closeCard() { const close = page.getByRole('button', { name: 'Закрыть карточку', exact: true }); if (await close.count()) await close.click() }
async function moveBetween(from, to) {
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 15 }); await page.mouse.up()
}
async function editNode(id) {
  await closeCard()
  const node = page.locator(`.react-flow__node[data-id="${id}"]`)
  await node.hover()
  await node.getByRole('button', { name: /^Редактировать:/ }).click()
}
async function showMembers(node, count) {
  const trigger = node.getByRole('button', { name: `Содержимое: ${count}` })
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
}
async function geometry(values) {
  const details = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Размещение на схеме' }) })
  if (await details.count() && !(await details.getAttribute('open'))) await details.locator('summary').click()
  for (const [key, value] of Object.entries(values)) await page.getByRole('spinbutton', { name: `Узел: ${key}`, exact: true }).fill(String(value))
}
async function createOnCanvas(canvas, type, name, position) {
  await canvas.click({ button: 'right', position })
  await page.getByRole('menuitem', { name: type, exact: true }).click()
  const title = page.getByRole('textbox', { name: 'Название нового объекта' })
  await title.fill(name)
  await title.press('Enter')
}
try {
  await page.goto(`${baseUrl}/my-table`)
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).waitFor()
  assert.equal(await page.getByRole('complementary', { name: 'Схемы кампании' }).count(), 0)
  const boardWidth = (await page.getByRole('region', { name: 'Схема кампании' }).boundingBox()).width
  const libraryWidth = (await page.getByRole('complementary', { name: 'Библиотека' }).boundingBox()).width
  assert.ok(boardWidth / (boardWidth + libraryWidth) > 0.66 && boardWidth / (boardWidth + libraryWidth) < 0.74)
  const canvas = page.locator('.react-flow')
  await canvas.click({ position: { x: 310, y: 330 } })
  assert.equal(await page.getByRole('menu', { name: 'Действия с холстом' }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Создать объект здесь' }).count(), 0)
  await canvas.click({ button: 'right', position: { x: 310, y: 330 } })
  assert.equal(await page.getByRole('menuitem', { name: 'Пока недоступно' }).isDisabled(), true)
  await canvas.click({ position: { x: 700, y: 350 } })
  assert.equal(await page.getByRole('menu', { name: 'Действия с холстом' }).count(), 0)
  await canvas.click({ button: 'right', position: { x: 360, y: 370 } })
  await page.getByRole('menu', { name: 'Действия с холстом' }).waitFor()
  await canvas.click({ position: { x: 750, y: 500 } })
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).dragTo(canvas, { targetPosition: { x: 80, y: 100 } })
  await waitForNodes(1)
  assert.ok((await page.locator('.react-flow__node').first().boundingBox()).height < 240)
  let state = await saved()
  const ghostId = state.diagrams[0].nodes[0].id
  assert.equal(entityFor(state, state.diagrams[0].nodes[0]).reference.entityId, '41')
  assert.deepEqual(Object.keys(state.diagrams[0].nodes[0].data), ['entityId'])
  assert.ok(Math.abs(state.diagrams[0].nodes[0].position.x - 80) < 5)
  // Нередактированный экземпляр загружает паспорт по прежней ссылке на бестиарий.
  const originalNode = page.locator(`.react-flow__node[data-id="${ghostId}"]`)
  await originalNode.hover()
  await originalNode.getByRole('button', { name: 'Показать больше', exact: true }).click()
  await originalNode.getByRole('region', { name: 'Боевой паспорт' }).waitFor()
  assert.ok((await originalNode.textContent()).includes('45'))
  await page.waitForFunction(id => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), ghostId)
  assert.equal(await originalNode.locator('[class*="nodeBadge"]').count(), 0)
  assert.deepEqual(await saved(), state)
  await originalNode.getByRole('button', { name: 'Скрыть подробности', exact: true }).click()
  await page.waitForFunction(id => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), ghostId)
  await editNode(ghostId)
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Тайный призрак')
  assert.equal(await page.getByRole('textbox', { name: 'Состояние экземпляра', exact: true }).count(), 0)
  await page.getByRole('textbox', { name: 'Хиты', exact: true }).fill('12 (3к8)')
  await page.getByRole('spinbutton', { name: 'Класс доспеха: Значение', exact: true }).fill('18')
  assert.equal(await page.getByRole('spinbutton', { name: 'Узел: width', exact: true }).count(), 0)
  await page.getByRole('region', { name: 'Описание экземпляра', exact: true }).click()
  const description = page.getByRole('textbox', { name: 'Описание экземпляра', exact: true })
  await description.fill('Секрет мастера')
  await page.getByRole('button', { name: 'Дублировать', exact: true }).click()
  await waitForNodes(2)
  state = await saved()
  const copyId = state.diagrams[0].nodes[1].id
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Второй призрак')
  await page.getByRole('textbox', { name: 'Хиты', exact: true }).fill('45 (10к8)')
  await geometry({ x: 440, y: 120 })
  await closeCard()
  state = await saved()
  assert.equal(entityFor(state, state.diagrams[0].nodes[0]).statBlock.entity.hitPoints, '12 (3к8)')
  assert.equal(entityFor(state, state.diagrams[0].nodes[1]).statBlock.entity.hitPoints, '45 (10к8)')
  assert.equal(entries[0].name, 'Призрак')

  // Настоящее перемещение и соединение двух узлов.
  const first = page.locator(`.react-flow__node[data-id="${ghostId}"]`)
  const second = page.locator(`.react-flow__node[data-id="${copyId}"]`)
  // Раскрытие заменяет компактную форму той же ноды, не меняя Entity и размещение.
  const beforeExpansion = await saved()
  const beforeSize = await first.boundingBox()
  await first.hover()
  await first.getByRole('button', { name: 'Показать больше', exact: true }).click()
  assert.ok(await first.evaluate(node => node.getAnimations({ subtree: true }).some(animation =>
    animation.playState === 'running' && animation.effect.getKeyframes().some(frame => frame.width && frame.height))), 'Размер самой ноды должен анимироваться')
  const expanded = first.getByRole('region', { name: 'Карточка существа: Тайный призрак' })
  await expanded.getByRole('region', { name: 'Боевой паспорт' }).waitFor()
  assert.ok((await expanded.textContent()).includes('Пассивная внимательность'))
  assert.ok((await expanded.textContent()).includes('Тёмное зрение'))
  assert.ok((await expanded.textContent()).includes('60 фт.'))
  assert.ok((await expanded.textContent()).includes('18'))
  assert.ok((await expanded.textContent()).includes('12'))
  await page.waitForFunction(id => {
    const node = document.querySelector(`.react-flow__node[data-id="${id}"]`)
    return node && node.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running')
  }, ghostId)
  const expandedSize = await first.boundingBox()
  assert.ok(expandedSize.width > beforeSize.width * 1.5)
  assert.ok(expandedSize.height > beforeSize.height)
  assert.equal(await first.locator('[class*="nodeBadge"]').count(), 0, 'Компактная нода не должна оставаться над карточкой')
  const cardBounds = await expanded.boundingBox()
  assert.ok(Math.abs(cardBounds.x - expandedSize.x) < 1 && Math.abs(cardBounds.y - expandedSize.y) < 1)
  assert.deepEqual(await saved(), beforeExpansion)
  await page.screenshot({ path: join(tmpdir(), 'campaign-creature-expanded.png') })
  await first.getByRole('button', { name: 'Скрыть подробности', exact: true }).click()
  assert.equal(await expanded.count(), 0)
  await page.waitForFunction(id => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), ghostId)
  assert.equal((await first.boundingBox()).width, beforeSize.width)
  assert.equal((await first.boundingBox()).height, beforeSize.height)
  // Быстрое переключение не оставляет половинный размер или вторую карточку.
  await first.getByRole('button', { name: 'Показать больше', exact: true }).evaluate(button => button.click())
  await first.getByRole('button', { name: 'Скрыть подробности', exact: true }).evaluate(button => button.click())
  await first.getByRole('button', { name: 'Показать больше', exact: true }).evaluate(button => button.click())
  await page.waitForFunction(id => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), ghostId)
  assert.equal((await first.boundingBox()).width, expandedSize.width)
  assert.equal(await first.locator('[class*="nodeBadge"]').count(), 0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await first.getByRole('button', { name: 'Скрыть подробности', exact: true }).click()
  assert.equal(await first.evaluate(node => node.getAnimations({ subtree: true }).filter(animation =>
    animation.playState === 'running' && animation.effect.getKeyframes().some(frame => frame.width && frame.height)).length), 0)
  assert.equal((await first.boundingBox()).width, beforeSize.width)
  assert.deepEqual(await saved(), beforeExpansion)
  await page.emulateMedia({ reducedMotion: null })
  const secondRect = await second.boundingBox()
  await moveBetween({ x: secondRect.x + 80, y: secondRect.y + 20 }, { x: secondRect.x + 100, y: secondRect.y + 160 })
  await closeCard()
  assert.equal(await first.locator('.source').evaluate(el => getComputedStyle(el).opacity), '0')
  await first.hover()
  await first.getByRole('heading').click({ button: 'right' })
  await first.getByRole('menuitem', { name: 'Связать с…' }).click()
  await page.getByRole('status').filter({ hasText: 'Выберите второй узел' }).waitFor()
  await second.getByRole('heading', { name: 'Второй призрак', exact: true }).click()
  await page.locator('.react-flow__edge').waitFor()
  await page.locator('.react-flow__edge').click()
  await page.getByRole('textbox', { name: 'Подпись связи', exact: true }).fill('Охраняет')
  await closeCard()
  assert.equal((await saved()).diagrams[0].edges[0].label, 'Охраняет')

  // Связи остаются у того же узла и приходят к контуру раскрытой карточки.
  const edgePath = page.locator('.react-flow__edge-path')
  const compactPath = await edgePath.getAttribute('d')
  const beforeLinkedExpansion = await saved()
  await first.hover()
  await first.getByRole('button', { name: 'Показать больше', exact: true }).click()
  await first.getByRole('region', { name: 'Боевой паспорт' }).waitFor()
  await page.waitForFunction(id => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), ghostId)
  assert.notEqual(await edgePath.getAttribute('d'), compactPath)
  assert.deepEqual(await saved(), beforeLinkedExpansion)
  // Развёрнутая карточка остаётся той же перемещаемой нодой; Undo не теряет её форму.
  const linkedBounds = await first.boundingBox()
  await moveBetween({ x: linkedBounds.x + 95, y: linkedBounds.y + 25 }, { x: linkedBounds.x + 127, y: linkedBounds.y + 53 })
  const movedExpansion = await saved()
  assert.ok(Math.abs(movedExpansion.diagrams[0].nodes.find(node => node.id === ghostId).position.x - beforeLinkedExpansion.diagrams[0].nodes.find(node => node.id === ghostId).position.x - 32) < 4)
  assert.deepEqual(movedExpansion.entities, beforeLinkedExpansion.entities)
  await page.keyboard.press('Control+z')
  assert.deepEqual((await saved()).diagrams[0].nodes.find(node => node.id === ghostId).position, beforeLinkedExpansion.diagrams[0].nodes.find(node => node.id === ghostId).position)
  assert.equal(await first.getByRole('region', { name: 'Боевой паспорт' }).count(), 1)
  await first.getByText('Тайный призрак', { exact: true }).dblclick()
  await page.getByRole('complementary', { name: 'Карточка и редактор' }).getByLabel('Класс доспеха 18').waitFor()
  await closeCard()
  await first.getByRole('button', { name: 'Скрыть подробности', exact: true }).click()
  await page.waitForFunction(id => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), ghostId)
  assert.equal(await edgePath.getAttribute('d'), compactPath)

  // Карточка схемы показывает локальный полный статблок, библиотека — оригинал.
  await first.getByRole('heading', { name: 'Тайный призрак', exact: true }).dblclick()
  await page.getByRole('complementary', { name: 'Карточка и редактор' }).getByRole('heading', { name: 'Тайный призрак', exact: true }).last().waitFor()
  await page.getByRole('complementary', { name: 'Карточка и редактор' }).getByLabel('Класс доспеха 18').waitFor()
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-card.png') })
  await closeCard()

  // У существа фиксированная форма, resize-контролов нет даже при выделении.
  await first.getByRole('heading', { name: 'Тайный призрак', exact: true }).click()
  await closeCard()
  assert.equal(await first.locator('.react-flow__resize-control').count(), 0)

  // Контейнер, перенос экземпляра и HTML DnD из библиотеки внутрь локации.
  await createOnCanvas(canvas, 'Локация', 'Крипта', { x: 60, y: 420 })
  const locationId = (await saved()).diagrams[0].nodes.find(node => node.type === 'location').id
  const placedLocation = (await saved()).diagrams[0].nodes.find(node => node.id === locationId)
  assert.notEqual(placedLocation.data.entityId, locationId)
  assert.ok(Math.abs(placedLocation.position.x - 60) < 5 && Math.abs(placedLocation.position.y - 420) < 5)
  await closeCard()
  const location = page.locator(`.react-flow__node[data-id="${locationId}"]`)
  assert.ok((await location.boundingBox()).height < 220)
  await location.getByRole('heading').click()
  const resize = location.locator('.react-flow__resize-control.bottom.right.handle')
  const handle = await resize.boundingBox()
  assert.ok(handle.width >= 24)
  const originalWidth = (await location.boundingBox()).width
  await moveBetween({ x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }, { x: handle.x + handle.width / 2 + 40, y: handle.y + handle.height / 2 + 20 })
  const resizedWidth = (await saved()).diagrams[0].nodes.find(node => node.id === locationId).width
  assert.ok(resizedWidth > originalWidth)
  await page.keyboard.press('Control+z')
  assert.equal((await saved()).diagrams[0].nodes.find(node => node.id === locationId).width, undefined)
  await page.keyboard.press('Control+Shift+z')
  assert.equal((await saved()).diagrams[0].nodes.find(node => node.id === locationId).width, resizedWidth)
  const ghostRect = await first.boundingBox(); const locationRect = await location.boundingBox()
  await moveBetween({ x: ghostRect.x + 80, y: ghostRect.y + 20 }, { x: locationRect.x + 95, y: locationRect.y + 40 })
  await closeCard()
  await waitForNodes(2)
  await showMembers(location, 1)
  await location.getByRole('button', { name: 'Тайный призрак', exact: true }).waitFor()
  await page.getByRole('searchbox', { name: 'Поиск в библиотеке', exact: true }).fill('Скелет')
  await page.getByRole('button', { name: 'Открыть: Скелет', exact: true }).dragTo(location, { targetPosition: { x: 120, y: 35 } })
  await showMembers(location, 2)
  await location.getByRole('button', { name: 'Скелет', exact: true }).waitFor()
  state = await saved()
  assert.equal(state.diagrams[0].nodes.filter(node => node.data.locationId === locationId).length, 2)
  const skeletonId = state.diagrams[0].nodes.find(node => entityFor(state, node).name === 'Скелет').id
  await createOnCanvas(canvas, 'Локация', 'Башня', { x: 460, y: 540 })
  await closeCard()
  state = await saved()
  const towerId = state.diagrams[0].nodes.find(node => entityFor(state, node).name === 'Башня').id
  const tower = page.locator(`.react-flow__node[data-id="${towerId}"]`)
  await showMembers(location, 2)
  await location.getByRole('button', { name: 'Скелет', exact: true }).locator('..').dragTo(tower, { targetPosition: { x: 120, y: 35 } })
  await showMembers(tower, 1)
  await tower.getByRole('button', { name: 'Скелет', exact: true }).waitFor()
  assert.equal((await saved()).diagrams[0].nodes.find(node => node.id === skeletonId).data.locationId, towerId)
  await tower.getByRole('button', { name: 'Извлечь: Скелет', exact: true }).click()
  assert.equal((await saved()).diagrams[0].nodes.find(node => node.id === skeletonId).data.locationId, undefined)

  // Только размещаемые разделы внутри workspace, без навигации на другую страницу.
  for (const [title, type] of [['Заклинания', 'spell'], ['Магические предметы', 'item']]) {
    await chooseCombobox(page, 'Раздел библиотеки', title)
    await page.getByRole('button', { name: `Открыть: Материал ${type}`, exact: true }).waitFor()
  }
  await page.getByRole('tab', { name: 'Моё', exact: true }).click()
  await page.getByRole('button', { name: 'Открыть: Герой', exact: true }).dragTo(tower, { targetPosition: { x: 120, y: 35 } })
  await showMembers(tower, 1)
  await tower.getByRole('button', { name: 'Герой', exact: true }).waitFor()
  await chooseCombobox(page, 'Раздел библиотеки', 'Кампании')
  await page.getByRole('alert').getByText('Источник ещё не подключён к серверу.').waitFor()
  assert.equal(new URL(page.url()).pathname, '/my-table')
  await page.getByRole('tab', { name: 'Энциклопедия', exact: true }).click()
  await chooseCombobox(page, 'Раздел библиотеки', 'Заклинания')
  await page.getByRole('searchbox', { name: 'Поиск в библиотеке', exact: true }).fill('Материал')
  await page.getByRole('separator', { name: 'Ширина библиотеки', exact: true }).press('ArrowLeft')
  const resizedLibraryWidth = (await saved()).layout.libraryWidth
  await page.waitForFunction(width => document.querySelector('[aria-label="Ширина библиотеки"]')?.getAttribute('aria-valuenow') === String(width), resizedLibraryWidth)
  await closeCard()
  const boardBeforeInspector = (await page.getByRole('region', { name: 'Схема кампании' }).boundingBox()).width
  await location.getByRole('heading', { name: 'Крипта', exact: true }).click()
  await page.getByRole('complementary', { name: 'Инспектор объекта' }).waitFor()
  const boardWithInspector = (await page.getByRole('region', { name: 'Схема кампании' }).boundingBox()).width
  assert.ok(boardWithInspector < boardBeforeInspector)
  await page.screenshot({ path: join(tmpdir(), 'campaign-local-inspector.png') })
  await page.getByRole('separator', { name: 'Ширина Inspector', exact: true }).press('ArrowLeft')
  await page.getByRole('textbox', { name: 'Название Entity', exact: true }).fill('Старая крипта')
  await page.getByRole('textbox', { name: 'Название Entity', exact: true }).press('Enter')
  await page.getByRole('region', { name: 'Описание Entity', exact: true }).click()
  await page.getByRole('textbox', { name: 'Описание Entity', exact: true }).fill('Подземный зал')
  state = await saved()
  assert.equal(entityFor(state, state.diagrams[0].nodes.find(node => node.id === locationId)).name, 'Старая крипта')
  assert.equal(state.diagrams[0].nodes.find(node => node.id === locationId).data.title, undefined)
  await location.getByRole('heading', { name: 'Старая крипта', exact: true }).dblclick()
  await page.getByRole('region', { name: 'Редактор Entity' }).waitFor()
  assert.equal(await page.getByRole('complementary', { name: 'Инспектор объекта' }).count(), 0)
  await page.getByRole('region', { name: 'Полное описание Entity', exact: true }).click()
  await page.getByRole('textbox', { name: 'Полное описание Entity', exact: true }).fill('Тайное подземелье')
  assert.match((await saved()).entities.find(entity => entity.id === state.diagrams[0].nodes.find(node => node.id === locationId).data.entityId).description, /Тайное подземелье/)
  await page.screenshot({ path: join(tmpdir(), 'campaign-local-editor.png') })
  await page.getByRole('tab', { name: 'Основная схема', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть Inspector' }).click()
  assert.ok((await page.getByRole('region', { name: 'Схема кампании' }).boundingBox()).width > boardWithInspector)
  const before = await saved()
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-desktop.png') })
  await page.reload()
  await page.getByRole('button', { name: 'Открыть: Материал spell', exact: true }).waitFor()
  assert.deepEqual(await saved(), before)
  assert.equal(await page.getByRole('searchbox', { name: 'Поиск в библиотеке' }).inputValue(), 'Материал')
  assert.equal(Number(await page.getByRole('separator', { name: 'Ширина библиотеки' }).getAttribute('aria-valuenow')), resizedLibraryWidth)
  await page.getByRole('button', { name: 'Свернуть библиотеку' }).click()
  assert.equal(await page.getByRole('complementary', { name: 'Библиотека' }).count(), 0)
  const expandedBoardWidth = (await page.getByRole('region', { name: 'Схема кампании' }).boundingBox()).width
  assert.ok(expandedBoardWidth > boardWidth + 200)
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click()
  await page.getByRole('button', { name: 'Открыть: Материал spell', exact: true }).waitFor()

  // Публичная вкладка не читает закрытый документ и не подгружает библиотеку/оригиналы.
  publicDocument = structuredClone(before)
  publicDocument.version = 2
  publicDocument.entities = []
  publicDocument.diagrams = [{ id: 'public', name: 'Общая схема', nodes: [{ id: 'public-location', type: 'location', position: { x: 50, y: 50 }, width: 340, height: 240, data: { title: 'Общая таверна', description: 'Публичное описание', state: '', facts: '' } }], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }]
  publicDocument.activeId = 'public'
  await page.goto(`${baseUrl}/my-table?table=public&campaign=denied`)
  await page.getByRole('alert').getByText('Сервер не разрешил доступ к этим материалам.').waitFor()
  assert.equal(await page.getByText('Тайный призрак', { exact: true }).count(), 0)
  assert.equal(await page.getByRole('complementary', { name: 'Библиотека' }).count(), 0)
  apiRequests.length = 0
  await page.goto(`${baseUrl}/my-table?table=public&campaign=allowed`)
  await page.getByRole('heading', { name: 'Общая таверна', exact: true }).waitFor()
  await page.locator('.react-flow__node[data-id="public-location"]').getByRole('heading', { name: 'Общая таверна' }).click()
  await page.getByRole('complementary', { name: 'Инспектор объекта' }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Название Entity' }).getAttribute('readonly'), '')
  await page.getByText('Только материалы, разрешённые сервером для публичного стола.').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Изменить', exact: true }).count(), 0)
  assert.ok(apiRequests.every(path => path === '/api/auth/session/' || path === '/api/campaigns/allowed/table/public/'))
  assert.deepEqual(await saved(), before)
  await page.getByRole('button', { name: 'Закрытый', exact: true }).click()
  await page.getByRole('heading', { name: 'Старая крипта', exact: true }).waitFor()

  // Мобильная раскладка и независимые схемы.
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.getByRole('button', { name: 'Выбрать схему: Основная схема' }).click()
  await page.getByRole('textbox', { name: 'Название новой схемы' }).fill('Подземелье')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await waitForNodes(0)
  await canvas.click({ button: 'right', position: { x: 120, y: 100 } })
  await page.getByRole('menuitem', { name: 'Заметка', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название нового объекта' }).fill('Черновик')
  await page.getByRole('textbox', { name: 'Название нового объекта' }).press('Escape')
  assert.equal((await saved()).diagrams[1].nodes.length, 0)
  assert.equal((await saved()).entities.some(entity => entity.entityType === 'note'), false)
  await createOnCanvas(canvas, 'Заметка', 'Секрет', { x: 120, y: 100 })
  await waitForNodes(1)
  assert.ok((await page.locator('.react-flow__node').first().boundingBox()).height < 160)
  assert.equal((await saved()).entities.find(entity => entity.entityType === 'note').name, 'Секрет')
  assert.equal((await saved()).diagrams[1].nodes[0].type, 'note')
  const noteId = (await saved()).diagrams[1].nodes[0].id
  await page.locator(`.react-flow__node[data-id="${noteId}"]`).getByRole('heading', { name: 'Секрет' }).click()
  await page.getByRole('complementary', { name: 'Инспектор объекта' }).waitFor()
  const nameField = page.getByRole('textbox', { name: 'Название Entity', exact: true })
  await nameField.click()
  await nameField.press('End')
  await nameField.press('Backspace')
  assert.equal((await saved()).diagrams[1].nodes.length, 1)
  await nameField.press('Escape')
  assert.equal((await saved()).entities.find(entity => entity.entityType === 'note').name, 'Секрет')
  await page.getByRole('region', { name: 'Описание Entity', exact: true }).click()
  await page.getByRole('textbox', { name: 'Описание Entity', exact: true }).fill('Скрытая заметка')
  assert.match((await saved()).entities.find(entity => entity.entityType === 'note').description, /Скрытая заметка/)
  assert.equal((await saved()).diagrams[1].nodes[0].data.description, undefined)
  await page.getByRole('button', { name: 'Открыть полностью' }).click()
  await page.getByRole('region', { name: 'Редактор Entity' }).waitFor()
  await page.getByRole('tab', { name: 'Подземелье', exact: true }).click()
  await canvas.click({ position: { x: 300, y: 350 } })
  assert.equal(await page.getByRole('complementary', { name: 'Инспектор объекта' }).count(), 0)
  for (const [name, key] of [['Удалить Delete', 'Delete'], ['Удалить Backspace', 'Backspace']]) {
    await createOnCanvas(canvas, 'Заметка', name, { x: 30, y: 300 })
    await waitForNodes(2)
    const temporary = page.locator('.react-flow__node').filter({ has: page.getByRole('heading', { name, exact: true }) })
    await temporary.getByRole('heading', { name, exact: true }).click()
    await page.keyboard.press(key)
    await waitForNodes(1)
    assert.equal((await saved()).diagrams[1].nodes.length, 1)
    assert.equal((await saved()).entities.some(entity => entity.name === name), true)
  }
  await createOnCanvas(canvas, 'Заметка', 'Удалить меню', { x: 30, y: 300 })
  await waitForNodes(2)
  const menuNote = page.locator('.react-flow__node').filter({ has: page.getByRole('heading', { name: 'Удалить меню', exact: true }) })
  await menuNote.hover()
  await menuNote.getByRole('button', { name: 'Удалить со схемы: Удалить меню' }).click()
  await waitForNodes(1)
  await page.reload()
  await page.getByRole('button', { name: 'Выбрать схему: Подземелье' }).click()
  await page.getByRole('textbox', { name: 'Название схемы', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Название схемы', exact: true }).inputValue(), 'Подземелье')
  await page.getByRole('navigation', { name: 'Выбор схемы' }).getByRole('button', { name: /Основная схема/ }).click()
  await page.getByRole('heading', { name: 'Старая крипта', exact: true }).waitFor()
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-mobile.png'), fullPage: true })

  const persistedBeforeFailure = await saved()
  // Повреждённое сохранение не стирается, quota показывает предупреждение.
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Quota exceeded') } })
  await page.getByRole('button', { name: 'Добавить на холст: Материал spell', exact: true }).click()
  await page.getByRole('alert').getByText(/Изменения не сохранены/).waitFor()
  assert.deepEqual(await saved(), persistedBeforeFailure)
  await page.reload()
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey)
  await page.reload()
  await page.getByRole('alert').getByText(/Не удалось восстановить/).waitFor()
  await page.getByRole('button', { name: 'Добавить на холст: Призрак', exact: true }).click()
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), '{broken')
  assert.deepEqual(errors, [])
  console.log('Мой стол: библиотека, DnD, узлы, Entity Inspector, рабочая вкладка, связи, локации, reload, размеры панелей, fail-closed public и мобильная раскладка — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-failure.png'), fullPage: true })
  console.error('Browser errors:', errors)
  throw error
} finally { await browser.close() }
