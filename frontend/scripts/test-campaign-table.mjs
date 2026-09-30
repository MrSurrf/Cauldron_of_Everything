// Реальный UI, изолированный Chromium и HTTP-фикстуры; без изменений серверной БД.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

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
  if (entry) return route.fulfill({ json: { ...entry, content_html: '<p>Описание оригинала</p>', data: { ...entry.summary, armor_class: 13, hit_points: '45 (10к8)', speed: '30 фт.' } } })
  if (url.pathname === '/api/characters/') return route.fulfill({ json: { count: 1, results: [{ id: 'hero', entityType: 'character', name: 'Герой', slug: 'hero', facts: ['Воин'], description: 'Описание героя' }] } })
  if (url.pathname === '/api/campaigns/allowed/table/public/') return route.fulfill({ json: { visibility: 'public', document: publicDocument } })
  if (url.pathname.includes('/table/public/')) return route.fulfill({ status: 403, json: {} })
  return route.fulfill({ status: 404, json: {} })
})
async function saved() { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey) }
async function waitForNodes(count) { await page.waitForFunction(expected => document.querySelectorAll('.react-flow__node').length === expected, count) }
async function closeCard() { const close = page.getByRole('button', { name: 'Закрыть карточку', exact: true }); if (await close.count()) await close.click() }
async function moveBetween(from, to) {
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 15 }); await page.mouse.up()
}
async function editNode(id) {
  await closeCard()
  await page.locator(`.react-flow__node[data-id="${id}"]`).getByRole('button', { name: 'Изменить', exact: true }).click()
}
async function geometry(values) {
  for (const [key, value] of Object.entries(values)) await page.getByRole('spinbutton', { name: `Узел: ${key}`, exact: true }).fill(String(value))
}
try {
  await page.goto(`${baseUrl}/my-table`)
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).waitFor()
  assert.equal(await page.getByRole('complementary', { name: 'Схемы кампании' }).count(), 0)
  const boardWidth = (await page.getByRole('region', { name: 'Схема кампании' }).boundingBox()).width
  const libraryWidth = (await page.getByRole('complementary', { name: 'Библиотека' }).boundingBox()).width
  assert.ok(boardWidth / (boardWidth + libraryWidth) > 0.66 && boardWidth / (boardWidth + libraryWidth) < 0.74)
  const canvas = page.locator('.react-flow')
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).dragTo(canvas, { targetPosition: { x: 80, y: 100 } })
  await waitForNodes(1)
  let state = await saved()
  const ghostId = state.diagrams[0].nodes[0].id
  assert.equal(state.diagrams[0].nodes[0].data.reference.entityId, '41')
  assert.ok(Math.abs(state.diagrams[0].nodes[0].position.x - 80) < 5)
  await editNode(ghostId)
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Тайный призрак')
  await page.getByRole('textbox', { name: 'Состояние экземпляра', exact: true }).fill('12 хитов')
  await geometry({ width: 290, height: 180 })
  await page.getByRole('region', { name: 'Описание экземпляра', exact: true }).click()
  const description = page.getByRole('textbox', { name: 'Описание экземпляра', exact: true })
  await description.fill('Секрет мастера')
  await page.getByRole('button', { name: 'Дублировать', exact: true }).click()
  await waitForNodes(2)
  state = await saved()
  const copyId = state.diagrams[0].nodes[1].id
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Второй призрак')
  await page.getByRole('textbox', { name: 'Состояние экземпляра', exact: true }).fill('45 хитов')
  await geometry({ x: 440, y: 120 })
  await closeCard()
  assert.equal((await saved()).diagrams[0].nodes[0].data.state, '12 хитов')
  assert.equal((await saved()).diagrams[0].nodes[1].data.state, '45 хитов')
  assert.equal(entries[0].name, 'Призрак')

  // Настоящее перемещение и соединение двух узлов.
  const first = page.locator(`.react-flow__node[data-id="${ghostId}"]`)
  const second = page.locator(`.react-flow__node[data-id="${copyId}"]`)
  const secondRect = await second.boundingBox()
  await moveBetween({ x: secondRect.x + 80, y: secondRect.y + 20 }, { x: secondRect.x + 100, y: secondRect.y + 160 })
  await closeCard()
  const sourceRect = await first.locator('.source').boundingBox(); const targetRect = await second.locator('.target').boundingBox()
  await moveBetween({ x: sourceRect.x + sourceRect.width / 2, y: sourceRect.y + sourceRect.height / 2 }, { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 })
  await page.locator('.react-flow__edge').waitFor()
  await page.locator('.react-flow__edge').click()
  await page.getByRole('textbox', { name: 'Подпись связи', exact: true }).fill('Охраняет')
  await closeCard()
  assert.equal((await saved()).diagrams[0].edges[0].label, 'Охраняет')

  // Карточка — существующий CreatureFullView, оригинал не подменяется экземпляром.
  await first.getByRole('button', { name: 'Открыть', exact: true }).click()
  await page.getByRole('complementary', { name: 'Карточка и редактор' }).getByRole('heading', { name: 'Призрак', exact: true }).waitFor()
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-card.png') })
  await closeCard()

  // Размер узла меняется мышью через NodeResizer, а не только числовыми полями.
  await first.getByRole('heading', { name: 'Тайный призрак', exact: true }).click()
  await closeCard()
  const resize = first.locator('.react-flow__resize-control.bottom.right.handle')
  const handle = await resize.boundingBox()
  assert.ok(handle)
  const widthBefore = (await saved()).diagrams[0].nodes[0].width
  await moveBetween({ x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }, { x: handle.x + handle.width / 2 + 20, y: handle.y + handle.height / 2 + 15 })
  assert.ok((await saved()).diagrams[0].nodes[0].width > widthBefore)

  // Контейнер, перенос экземпляра и HTML DnD из библиотеки внутрь локации.
  await page.getByRole('button', { name: '+ Локация', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Крипта')
  await geometry({ x: 60, y: 420, width: 330, height: 230 })
  const locationId = (await saved()).diagrams[0].nodes.find(node => node.type === 'location').id
  await closeCard()
  const location = page.locator(`.react-flow__node[data-id="${locationId}"]`)
  const ghostRect = await first.boundingBox(); const locationRect = await location.boundingBox()
  await moveBetween({ x: ghostRect.x + 80, y: ghostRect.y + 20 }, { x: locationRect.x + 95, y: locationRect.y + 40 })
  await closeCard()
  await waitForNodes(2)
  await location.getByRole('button', { name: 'Тайный призрак', exact: true }).waitFor()
  await page.getByRole('searchbox', { name: 'Поиск в библиотеке', exact: true }).fill('Скелет')
  await page.getByRole('button', { name: 'Открыть: Скелет', exact: true }).dragTo(location, { targetPosition: { x: 150, y: 130 } })
  await location.getByRole('button', { name: 'Скелет', exact: true }).waitFor()
  state = await saved()
  assert.equal(state.diagrams[0].nodes.filter(node => node.data.locationId === locationId).length, 2)
  const skeletonId = state.diagrams[0].nodes.find(node => node.data.title === 'Скелет').id
  await page.getByRole('button', { name: '+ Локация', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Башня')
  await geometry({ x: 460, y: 440, width: 330, height: 240 })
  await closeCard()
  state = await saved()
  const towerId = state.diagrams[0].nodes.find(node => node.data.title === 'Башня').id
  const tower = page.locator(`.react-flow__node[data-id="${towerId}"]`)
  await location.getByRole('button', { name: 'Скелет', exact: true }).locator('..').dragTo(tower, { targetPosition: { x: 160, y: 130 } })
  await tower.getByRole('button', { name: 'Скелет', exact: true }).waitFor()
  assert.equal((await saved()).diagrams[0].nodes.find(node => node.id === skeletonId).data.locationId, towerId)
  await tower.getByRole('button', { name: 'Извлечь: Скелет', exact: true }).click()
  assert.equal((await saved()).diagrams[0].nodes.find(node => node.id === skeletonId).data.locationId, undefined)

  // Все разделы внутри workspace, без навигации на другую страницу.
  for (const [title, type] of [['Классы', 'class'], ['Расы', 'race'], ['Предыстории', 'background'], ['Черты', 'feat'], ['Заклинания', 'spell'], ['Магические предметы', 'item'], ['Справочные материалы', 'reference']]) {
    await page.getByRole('combobox', { name: 'Раздел библиотеки' }).selectOption(type)
    await page.getByRole('button', { name: `Открыть: Материал ${type}`, exact: true }).waitFor()
  }
  await page.getByRole('tab', { name: 'Моё', exact: true }).click()
  await page.getByRole('button', { name: 'Открыть: Герой', exact: true }).dragTo(tower, { targetPosition: { x: 160, y: 130 } })
  await tower.getByRole('button', { name: 'Герой', exact: true }).waitFor()
  await page.getByRole('combobox', { name: 'Раздел библиотеки' }).selectOption('campaign')
  await page.getByRole('alert').getByText('Источник ещё не подключён к серверу.').waitFor()
  assert.equal(new URL(page.url()).pathname, '/my-table')
  await page.getByRole('tab', { name: 'Энциклопедия', exact: true }).click()
  await page.getByRole('combobox', { name: 'Раздел библиотеки' }).selectOption('spell')
  await page.getByRole('searchbox', { name: 'Поиск в библиотеке', exact: true }).fill('Материал')
  await page.getByRole('separator', { name: 'Ширина библиотеки', exact: true }).press('ArrowLeft')
  const resizedLibraryWidth = Number(await page.getByRole('separator', { name: 'Ширина библиотеки' }).getAttribute('aria-valuenow'))
  await location.getByRole('button', { name: 'Изменить', exact: true }).click()
  await page.getByRole('separator', { name: 'Ширина карточки', exact: true }).press('ArrowLeft')
  await closeCard()
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
  publicDocument.diagrams = [{ id: 'public', name: 'Общая схема', nodes: [{ id: 'public-location', type: 'location', position: { x: 50, y: 50 }, width: 340, height: 240, data: { title: 'Общая таверна', description: 'Публичное описание', state: '', facts: '' } }], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }]
  publicDocument.activeId = 'public'
  await page.goto(`${baseUrl}/my-table?table=public&campaign=denied`)
  await page.getByRole('alert').getByText('Сервер не разрешил доступ к этим материалам.').waitFor()
  assert.equal(await page.getByText('Тайный призрак', { exact: true }).count(), 0)
  assert.equal(await page.getByRole('complementary', { name: 'Библиотека' }).count(), 0)
  apiRequests.length = 0
  await page.goto(`${baseUrl}/my-table?table=public&campaign=allowed`)
  await page.getByRole('heading', { name: 'Общая таверна', exact: true }).waitFor()
  await page.locator('.react-flow__node[data-id="public-location"]').getByRole('button', { name: 'Открыть', exact: true }).click()
  await page.getByText('Только материалы, разрешённые сервером для публичного стола.').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Изменить', exact: true }).count(), 0)
  assert.ok(apiRequests.every(path => path === '/api/auth/session/' || path === '/api/campaigns/allowed/table/public/'))
  assert.deepEqual(await saved(), before)
  await page.getByRole('button', { name: 'Закрытый', exact: true }).click()
  await page.getByRole('heading', { name: 'Крипта', exact: true }).waitFor()

  // Мобильная раскладка и независимые схемы.
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.getByRole('button', { name: 'Выбрать схему: Основная схема' }).click()
  await page.getByRole('textbox', { name: 'Название новой схемы' }).fill('Подземелье')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await waitForNodes(0)
  await page.reload()
  await page.getByRole('button', { name: 'Выбрать схему: Подземелье' }).click()
  await page.getByRole('textbox', { name: 'Название схемы', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Название схемы', exact: true }).inputValue(), 'Подземелье')
  await page.getByRole('navigation', { name: 'Выбор схемы' }).getByRole('button', { name: /Основная схема/ }).click()
  await page.getByRole('heading', { name: 'Крипта', exact: true }).waitFor()
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-mobile.png'), fullPage: true })

  // Повреждённое сохранение не стирается, quota показывает предупреждение.
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Quota exceeded') } })
  await page.getByRole('button', { name: 'Добавить на холст: Материал spell', exact: true }).click()
  await page.getByRole('alert').getByText(/Изменения не сохранены/).waitFor()
  assert.deepEqual(await saved(), { ...before, diagrams: [...before.diagrams, (await saved()).diagrams[1]] })
  await page.reload()
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey)
  await page.reload()
  await page.getByRole('alert').getByText(/Не удалось восстановить/).waitFor()
  await page.getByRole('button', { name: 'Добавить на холст: Призрак', exact: true }).click()
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), '{broken')
  assert.deepEqual(errors, [])
  console.log('Мой стол: библиотека, DnD, узлы, экземпляры, редактор, связи, локации, переносы, reload, размеры панелей, fail-closed public и мобильная раскладка — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-failure.png'), fullPage: true })
  console.error('Browser errors:', errors)
  throw error
} finally { await browser.close() }
