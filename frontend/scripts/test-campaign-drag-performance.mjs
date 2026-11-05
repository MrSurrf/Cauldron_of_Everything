// Регрессия drag в Chromium: реальные события мыши, изолированное хранилище и HTTP-фикстуры.
// Запуск: npm run dev, затем node scripts/test-campaign-drag-performance.mjs.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v2'
const movingId = 'node0'
const entities = Array.from({ length: 80 }, (_, i) => ({
  id: `entity${i}`, slug: `quest${i}`, entityType: 'quest', name: `Задание ${i}`,
  description: `Описание задания ${i}.`, facts: '', state: '',
  wiki: { aliases: [], status: '', tags: [], world: '', customProperties: [], sections: [], media: {} },
}))
const initial = {
  version: 4, activeId: 'drag-performance', entities,
  layout: { libraryWidth: 336, inspectorWidth: 380, section: 'creature', query: '' },
  diagrams: [{
    id: 'drag-performance', name: 'Проверка перетаскивания', viewport: { x: 0, y: 0, zoom: 1 },
    nodes: entities.map((entity, i) => ({
      id: `node${i}`, type: 'entity', width: 260, height: 160,
      position: i === 0 ? { x: 80, y: 80 } : { x: 800 + (i - 1) % 8 * 310, y: 80 + Math.floor((i - 1) / 8) * 220 },
      data: { entityId: entity.id },
    })),
    // Двигаемая нода не связана: все 78 рёбер соединяют неподвижные ноды.
    edges: Array.from({ length: 78 }, (_, i) => ({ id: `edge${i}`, source: `node${i + 1}`, target: `node${i + 2}` })),
  }],
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, reducedMotion: 'reduce' })
const page = await context.newPage()
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', error => errors.push(error.message))

await context.addInitScript(({ storageKey, initial }) => {
  localStorage.setItem('surveyAuth.access', 'campaign-drag-performance-test')
  if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(initial))

  const empty = () => ({ serializations: 0, serializationMs: 0, writes: 0, writeMs: 0, nodes: {}, edges: {}, panels: {} })
  const probe = globalThis.__campaignDragProbe = {
    counts: empty(),
    reset() { this.counts = empty() },
    render(kind, id) { this.counts[kind][id] = (this.counts[kind][id] || 0) + 1 },
  }
  const stringify = JSON.stringify
  JSON.stringify = function (value, ...args) {
    const table = value?.version === 4 && Array.isArray(value.diagrams)
    const started = performance.now()
    try { return stringify.call(this, value, ...args) } finally {
      if (table) { probe.counts.serializations++; probe.counts.serializationMs += performance.now() - started }
    }
  }
  const setItem = Storage.prototype.setItem
  Storage.prototype.setItem = function (key, value) {
    const table = this === localStorage && key === storageKey
    const started = performance.now()
    try { return setItem.call(this, key, value) } finally {
      if (table) { probe.counts.writes++; probe.counts.writeMs += performance.now() - started }
    }
  }
}, { storageKey, initial })

await context.route('**/api/**', route => {
  const { pathname } = new URL(route.request().url())
  // У Vite также есть /src/shared/api/*.ts: эти модули не являются серверным API.
  if (!pathname.startsWith('/api/')) return route.continue()
  return route.fulfill({ json: pathname === '/api/auth/session/' ? { authenticated: true } : { count: 0, results: [] } })
})

// Счётчики внедряются только в ответы dev-сервера; production-код не содержит диагностики.
const instrumented = new Set()
await context.route(url => /\/ui\/(?:NodeRenderer|ContourEdge|LocalEntityPanel)\.tsx$/.test(url.pathname), async route => {
  const filename = new URL(route.request().url()).pathname.split('/').at(-1)
  const name = { 'NodeRenderer.tsx': 'NodeRenderer', 'ContourEdge.tsx': 'ContourEdge', 'LocalEntityPanel.tsx': 'InspectorContent' }[filename]
  const response = await route.fetch()
  const source = await response.text()
  // Матчим именованную функцию, включая memo(function Name(...)), без привязки к форматированию тела.
  const signature = new RegExp(`function\\s+${name}\\s*\\((?:[^()]|\\([^()]*\\))*\\)\\s*\\{`)
  assert.match(source, signature, `Dev-модуль ${name} должен содержать именованную функцию для счётчика рендеров`)
  const statement = name === 'NodeRenderer'
    ? 'globalThis.__campaignDragProbe.render("nodes", id);'
    : name === 'ContourEdge' ? 'globalThis.__campaignDragProbe.render("edges", props.id);'
      : 'globalThis.__campaignDragProbe.render("panels", nodeId);'
  instrumented.add(name)
  await route.fulfill({ response, body: source.replace(signature, match => `${match}\n${statement}\n`) })
})

const node = id => page.locator(`.react-flow__node[data-id="${id}"]`)
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
const savedNode = async () => (await saved()).diagrams[0].nodes.find(item => item.id === movingId)
const counts = () => page.evaluate(() => globalThis.__campaignDragProbe.counts)
const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
const renderedPosition = () => node(movingId).evaluate(element => {
  const transform = new DOMMatrixReadOnly(element.style.transform)
  return { x: transform.e, y: transform.f }
})
async function waitForSavedPosition(position) {
  await page.waitForFunction(({ key, id, position }) => {
    const node = JSON.parse(localStorage.getItem(key))?.diagrams[0].nodes.find(item => item.id === id)
    return node?.position.x === position.x && node?.position.y === position.y
  }, { key: storageKey, id: movingId, position })
}
try {
  await page.goto(`${baseUrl}/my-table`)
  await node(movingId).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => Object.keys(globalThis.__campaignDragProbe.counts.nodes).length === 80
    && Object.keys(globalThis.__campaignDragProbe.counts.edges).length === 78)
  assert.deepEqual([...instrumented].sort(), ['ContourEdge', 'InspectorContent', 'NodeRenderer'])
  assert.equal(await page.locator('.react-flow__node').count(), 80)
  assert.deepEqual((await savedNode()).position, initial.diagrams[0].nodes[0].position)
  await node(movingId).getByRole('heading').click()
  await page.getByRole('complementary', { name: 'Wiki-карточка объекта', exact: true }).waitFor()
  await frames()

  const originalPosition = await renderedPosition()
  const rect = await node(movingId).boundingBox()
  const start = { x: rect.x + rect.width / 2, y: rect.y + 65 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 10, start.y + 5)
  await frames()
  assert.equal(await node(movingId).locator('article').getAttribute('data-dragging'), 'true')
  // Выделение и начало жеста допустимо обновляют интерфейс; измеряем только движение внутри жеста.
  await page.evaluate(() => globalThis.__campaignDragProbe.reset())
  const updateMs = []
  const positions = []
  const dragStarted = performance.now()
  for (let step = 1; step <= 24; step++) {
    const started = performance.now()
    await page.mouse.move(start.x + 10 + step * 3, start.y + 5 + step * 2)
    await frames()
    updateMs.push(performance.now() - started)
    positions.push(await renderedPosition())
  }
  const dragMs = performance.now() - dragStarted
  const duringDrag = await counts()
  const finalPosition = await renderedPosition()
  assert.equal(new Set(positions.map(position => `${position.x}:${position.y}`)).size, 24,
    'Каждое из 24 движений должно обновить видимую позицию ноды')
  assert.notDeepEqual(finalPosition, originalPosition, 'Реальные события мыши должны переместить ноду')
  assert.equal(duringDrag.serializations, 0, 'Движение не сериализует документ кампании')
  assert.equal(duringDrag.writes, 0, 'Движение не записывает документ в localStorage')
  assert.deepEqual(Object.fromEntries(Object.entries(duringDrag.nodes).filter(([id]) => id !== movingId)), {},
    'Неподвижные ноды не перерисовываются при движении несвязанной ноды')
  assert.deepEqual(duringDrag.edges, {}, 'Связи неподвижных нод не перерисовываются')
  assert.deepEqual(duringDrag.panels, {}, 'Открытая wiki-карточка не перерисовывается от изменения координат')
  assert.deepEqual((await savedNode()).position, originalPosition, 'До mouseup остаётся последнее завершённое состояние')

  await page.mouse.up()
  await waitForSavedPosition(finalPosition)
  await frames()
  const afterDrag = await counts()
  assert.equal(afterDrag.serializations, 1, 'Mouseup ровно один раз сериализует завершённый жест')
  assert.equal(afterDrag.writes, 1, 'Mouseup ровно один раз сохраняет финальную позицию')
  await page.keyboard.press('Control+z')
  await waitForSavedPosition(originalPosition)
  assert.deepEqual(await renderedPosition(), originalPosition, 'Undo возвращает начало всего жеста')
  await page.keyboard.press('Control+Shift+z')
  await waitForSavedPosition(finalPosition)
  assert.deepEqual(await renderedPosition(), finalPosition, 'Redo возвращает конец всего жеста')
  await page.reload()
  await node(movingId).waitFor()
  assert.deepEqual(await renderedPosition(), finalPosition, 'Reload восстанавливает финальную позицию')

  // Resize использует ту же границу жеста: окончательный размер обязан сохраниться.
  await node(movingId).getByRole('heading').click()
  await page.getByRole('complementary', { name: 'Wiki-карточка объекта', exact: true }).waitFor()
  const beforeResize = await savedNode()
  const handle = node(movingId).locator('.react-flow__resize-control.bottom.right.handle')
  const handleRect = await handle.boundingBox()
  assert.ok(handleRect, 'У выбранной quest-ноды есть ручка изменения размера')
  const corner = { x: handleRect.x + handleRect.width / 2, y: handleRect.y + handleRect.height / 2 }
  await page.mouse.move(corner.x, corner.y)
  await page.mouse.down()
  await page.mouse.move(corner.x + 48, corner.y + 32, { steps: 8 })
  await page.mouse.up()
  await page.waitForFunction(({ key, id, width }) =>
    JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.find(item => item.id === id).width > width,
  { key: storageKey, id: movingId, width: beforeResize.width })
  const resized = await savedNode()
  assert.ok(resized.height > beforeResize.height, 'Mouseup сохраняет обе координаты размера')
  await page.keyboard.press('Control+z')
  await page.waitForFunction(({ key, id, width }) =>
    JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.find(item => item.id === id).width === width,
  { key: storageKey, id: movingId, width: beforeResize.width })
  await page.keyboard.press('Control+Shift+z')
  await page.waitForFunction(({ key, id, width }) =>
    JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.find(item => item.id === id).width === width,
  { key: storageKey, id: movingId, width: resized.width })
  await page.reload()
  await node(movingId).waitFor()
  assert.deepEqual(await savedNode(), resized, 'Reload сохраняет позицию и размер после Redo')
  assert.deepEqual(await renderedPosition(), finalPosition)

  // Потерянный mouseup завершает текущую транзакцию; продолжение drag создаёт новую.
  const resumedRect = await node(movingId).boundingBox()
  const resumedStart = { x: resumedRect.x + resumedRect.width / 2, y: resumedRect.y + 65 }
  await page.mouse.move(resumedStart.x, resumedStart.y)
  await page.mouse.down()
  await page.mouse.move(resumedStart.x + 10, resumedStart.y + 5)
  await frames()
  await page.evaluate(() => globalThis.__campaignDragProbe.reset())
  await page.mouse.move(resumedStart.x + 18, resumedStart.y + 10)
  await frames()
  const blurPosition = await renderedPosition()
  assert.equal((await counts()).writes, 0)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await waitForSavedPosition(blurPosition)
  await frames()
  const afterBlur = await counts()
  assert.equal(afterBlur.serializations, 1, 'Blur завершает и сериализует прерванный жест один раз')
  assert.equal(afterBlur.writes, 1, 'Blur сохраняет промежуточную позицию без mouseup')

  await page.evaluate(() => globalThis.__campaignDragProbe.reset())
  for (let step = 1; step <= 3; step++) {
    await page.mouse.move(resumedStart.x + 28 + step * 4, resumedStart.y + 15 + step * 3)
    await frames()
  }
  const resumedPosition = await renderedPosition()
  assert.notDeepEqual(resumedPosition, blurPosition, 'Drag продолжается после blur без нового mousedown')
  assert.equal((await counts()).serializations, 0, 'Продолжение после blur снова откладывает сериализацию')
  assert.equal((await counts()).writes, 0, 'Продолжение после blur снова откладывает сохранение')
  await page.mouse.up()
  await waitForSavedPosition(resumedPosition)
  await frames()
  assert.equal((await counts()).serializations, 1)
  assert.equal((await counts()).writes, 1, 'Mouseup сохраняет только новый участок жеста')
  await page.keyboard.press('Control+z')
  await waitForSavedPosition(blurPosition)
  assert.deepEqual(await renderedPosition(), blurPosition, 'Undo продолженного жеста возвращает состояние на момент blur')
  await page.keyboard.press('Control+Shift+z')
  await waitForSavedPosition(resumedPosition)

  // Настоящая навигация вызывает pagehide до уничтожения страницы и сохраняет активный drag.
  const reloadRect = await node(movingId).boundingBox()
  const reloadStart = { x: reloadRect.x + reloadRect.width / 2, y: reloadRect.y + 65 }
  await page.mouse.move(reloadStart.x, reloadStart.y)
  await page.mouse.down()
  await page.mouse.move(reloadStart.x + 18, reloadStart.y + 12, { steps: 3 })
  await frames()
  const positionBeforeReload = await renderedPosition()
  assert.notDeepEqual(positionBeforeReload, resumedPosition)
  assert.deepEqual((await savedNode()).position, resumedPosition, 'До pagehide активный drag остаётся несохранённым')
  await page.reload()
  await node(movingId).waitFor()
  await page.mouse.up()
  assert.deepEqual((await savedNode()).position, positionBeforeReload, 'Pagehide сохраняет активный drag перед reload')
  assert.deepEqual(await renderedPosition(), positionBeforeReload)
  assert.deepEqual(errors, [])

  const ordered = [...updateMs].sort((a, b) => a - b)
  console.log('Перетаскивание 80 нод / 78 связей: 24 движения, 0 сериализаций и записей, 0 рендеров неподвижных нод, связей и открытой wiki-карточки; mouseup, Undo, Redo, reload, resize, blur/продолжение и pagehide — OK.')
  console.log(`Наблюдаемые времена с ожиданием двух кадров и протоколом Playwright: жест ${dragMs.toFixed(1)} мс, медиана движения ${ordered[Math.floor(ordered.length / 2)].toFixed(1)} мс; сериализация после mouseup ${afterDrag.serializationMs.toFixed(2)} мс, localStorage ${afterDrag.writeMs.toFixed(2)} мс. Это диагностические значения без порога FPS.`)
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'campaign-drag-performance-failure.png'), fullPage: true })
  console.error('Browser errors:', errors)
  console.error('Drag counters:', await counts().catch(() => null))
  throw error
} finally {
  await context.close()
  await browser.close()
}
