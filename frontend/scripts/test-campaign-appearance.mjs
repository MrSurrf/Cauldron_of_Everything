// Chromium, настоящие жесты resize и изолированный localStorage; серверная БД не затрагивается.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v2'
const initial = {
  version: 3,
  activeId: 'appearance',
  entities: [
    { id: 'entity-note', slug: 'note', entityType: 'note', name: 'Записка картографа с длинным заголовком', description: '<p>У северной стены спрятан вход в подземелье. Покажите эту записку хранителю библиотеки. Сверхдлинноесловобезпробеловпроверяетперенос.</p>', facts: '', state: '' },
    { id: 'entity-quest', slug: 'quest', entityType: 'quest', name: 'Найти пропавший караван и вернуть реликвию', description: '<p>Расспросить свидетелей у старого моста, найти следы каравана и выяснить судьбу охраны.</p>', facts: '', state: '' },
    { id: 'entity-location', slug: 'location', entityType: 'location', name: 'Северная башня и библиотека древнего города', description: '<p>Тихая библиотека над торговой площадью. Под башней проходит забытый подземный ход.</p>', facts: '', state: '' },
  ],
  diagrams: [{
    id: 'appearance', name: 'Проверка оформления', viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [
      { id: 'note', type: 'note', position: { x: 90, y: 80 }, width: 260, height: 180, data: { entityId: 'entity-note' } },
      { id: 'quest', type: 'entity', position: { x: 790, y: 80 }, width: 280, height: 160, data: { entityId: 'entity-quest' } },
      { id: 'location', type: 'location', position: { x: 90, y: 570 }, width: 280, height: 200, data: { entityId: 'entity-location' } },
    ],
    edges: [{ id: 'note-quest', source: 'note', target: 'quest', label: 'Помогает выполнить' }],
  }],
  layout: { libraryWidth: 336, inspectorWidth: 380, section: 'creature', query: '' },
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
const page = await browser.newPage({ viewport: { width: 1840, height: 1280 } })
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'campaign-appearance-test'))
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  return route.fulfill({ json: path === '/api/auth/session/' ? { authenticated: true } : { count: 0, results: [] } })
})

const node = id => page.locator(`.react-flow__node[data-id="${id}"]`)
const edge = () => page.locator('.react-flow__edge[data-id="note-quest"]')
async function saved() { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey) }
async function closeInspector() {
  for (const name of ['Закрыть Inspector', 'Закрыть карточку']) {
    const button = page.getByRole('button', { name, exact: true })
    if (await button.count()) await button.click()
  }
}
async function settleNode(id) {
  await page.waitForFunction(id => document.querySelector(`.react-flow__node[data-id="${id}"]`)
    ?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), id)
}
async function settleEdge() {
  await page.waitForFunction(() => document.querySelector('.react-flow__edge[data-id="note-quest"]')
    ?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'))
}
async function resize(id, width, height, belowMinimum = false) {
  await node(id).getByRole('heading').click()
  const before = await node(id).boundingBox()
  const handle = await node(id).locator('.react-flow__resize-control.bottom.right.handle').boundingBox()
  assert.ok(handle && handle.width >= 24 && handle.height >= 24, `${id}: доступная область resize не меньше 24px`)
  const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  // Последний жест каждого типа намеренно выходит за минимум: размер должен остановиться на границе.
  const requestedWidth = belowMinimum ? width - 60 : width
  const requestedHeight = belowMinimum ? height - 60 : height
  await page.mouse.move(start.x + requestedWidth - before.width, start.y + requestedHeight - before.height, { steps: 16 })
  await page.mouse.up()
  await page.waitForFunction(({ key, id, width, height }) => {
    const stored = JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.find(item => item.id === id)
    return Math.abs(stored.width - width) < 2 && Math.abs(stored.height - height) < 2
  }, { key: storageKey, id, width, height })
  await settleNode(id)
  const bounds = await node(id).boundingBox()
  assert.ok(Math.abs(bounds.width - width) < 2 && Math.abs(bounds.height - height) < 2,
    `${id}: ожидается ${width}×${height}, получилось ${bounds.width}×${bounds.height}`)
  return bounds
}
async function contentFits(id) {
  const result = await node(id).locator('article').evaluate(article => {
    const outer = article.getBoundingClientRect()
    return [...article.querySelectorAll('[class*="nodeCaption"], [class*="nodeCardContent"], [class*="locationImage"]')].map(element => {
      const rect = element.getBoundingClientRect()
      return { className: element.className, width: rect.width, height: rect.height,
        inside: rect.left >= outer.left - 1 && rect.top >= outer.top - 1 && rect.right <= outer.right + 1 && rect.bottom <= outer.bottom + 1,
        wraps: element.scrollWidth <= element.clientWidth + 1 }
    })
  })
  assert.ok(result.length > 0, `${id}: содержимое присутствует`)
  assert.ok(result.every(item => item.inside && item.wraps), `${id}: содержимое вышло за границы: ${JSON.stringify(result)}`)
}
async function foldSize() {
  const fold = await node('note').locator('[class*="noteFold"]').boundingBox()
  assert.ok(fold && fold.width > 0, 'Загиб записки виден')
  assert.ok(Math.abs(fold.width - fold.height) < 0.5, `Загиб должен быть квадратным: ${JSON.stringify(fold)}`)
  return fold.width
}
async function noMotion(locator) {
  const moving = await locator.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running' && (Number(animation.effect?.getTiming().duration) > 1 || animation.effect?.getTiming().iterations === Infinity))
    .map(animation => ({ name: animation.animationName, timing: animation.effect.getTiming() })))
  assert.deepEqual(moving, [], 'При reduced-motion нет длительных анимаций карты')
}
async function clickWithDeparture(button) {
  return button.evaluate(button => {
    button.click()
    return new Promise(resolve => requestAnimationFrame(() => {
      const path = document.querySelector('[data-departing-connections] path')
      resolve(path ? { path: path.getAttribute('d'), stroke: getComputedStyle(path).stroke,
        running: path.getAnimations().some(animation => animation.playState === 'running') } : null)
    }))
  })
}

try {
  await page.goto(`${baseUrl}/my-table`)
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: initial })
  await page.reload()
  await page.waitForFunction(() => document.querySelectorAll('.react-flow__node').length === 3)
  await page.getByRole('button', { name: 'Свернуть библиотеку', exact: true }).click()

  const originalFold = await foldSize()
  const sizes = {
    note: [[520, 130], [220, 360], [190, 128]],
    quest: [[520, 110], [220, 360], [220, 96]],
    location: [[520, 180], [220, 360], [220, 148]],
  }
  for (const [id, checks] of Object.entries(sizes)) {
    for (const [index, [width, height]] of checks.entries()) {
      await resize(id, width, height, index === checks.length - 1)
      await contentFits(id)
      if (id === 'note') assert.ok(Math.abs(await foldSize() - originalFold) < 0.5, 'Размер загиба сохраняется при resize')
    }
  }
  await closeInspector()
  await page.screenshot({ path: join(tmpdir(), 'campaign-appearance-minimum.png') })
  const minimum = await saved()
  await page.keyboard.press('Control+z')
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.find(item => item.id === 'location').height === 360, storageKey)
  await page.keyboard.press('Control+Shift+z')
  assert.deepEqual((await saved()).diagrams[0].nodes, minimum.diagrams[0].nodes, 'Resize undo/redo восстанавливает геометрию')
  await page.reload()
  await node('note').waitFor()
  for (const id of Object.keys(sizes)) await contentFits(id)
  assert.ok(Math.abs(await foldSize() - originalFold) < 0.5, 'Размер загиба сохраняется после reload')

  // Оформление связи меняется через настоящий Inspector; документ и SVG проверяются независимо.
  await edge().click()
  await page.getByRole('button', { name: 'Плавная линия', exact: true }).click()
  await page.getByRole('button', { name: 'Штриховая линия', exact: true }).click()
  await page.getByRole('button', { name: 'Стрелки в обе стороны', exact: true }).click()
  await page.getByRole('button', { name: 'Цвет связи: Лёд', exact: true }).click()
  await settleEdge()
  await page.screenshot({ path: join(tmpdir(), 'campaign-edge-controls.png') })
  await closeInspector()
  await settleEdge()
  const styled = await saved()
  const storedEdge = styled.diagrams[0].edges.find(item => item.id === 'note-quest')
  assert.equal(storedEdge.data.lineStyle, 'dashed')
  assert.equal(storedEdge.data.color, 'cyan')
  assert.equal(storedEdge.data.pathStyle, 'bezier')
  assert.equal(storedEdge.data.direction, 'both')
  assert.match(await edge().locator('.react-flow__edge-path').getAttribute('d'), /C/, 'Плавная связь рисуется кривой Безье')
  assert.ok(await edge().locator('.react-flow__edge-path').getAttribute('marker-start'), 'В начале связи есть стрелка')
  assert.ok(await edge().locator('.react-flow__edge-path').getAttribute('marker-end'), 'В конце связи есть стрелка')
  const appearance = await edge().locator('.react-flow__edge-path').evaluate(path => ({ stroke: getComputedStyle(path).stroke, dash: getComputedStyle(path).strokeDasharray }))
  assert.notEqual(appearance.dash, 'none', 'SVG отображает пунктирную связь')
  await page.keyboard.press('Control+z')
  assert.notEqual((await saved()).diagrams[0].edges[0].data?.color, 'cyan', 'Undo отменяет изменение цвета')
  await page.keyboard.press('Control+Shift+z')
  assert.deepEqual((await saved()).diagrams[0].edges, styled.diagrams[0].edges)
  await page.reload()
  await edge().waitFor()
  await settleEdge()
  assert.deepEqual((await saved()).diagrams[0].edges, styled.diagrams[0].edges)
  assert.deepEqual(await edge().locator('.react-flow__edge-path').evaluate(path => ({ stroke: getComputedStyle(path).stroke, dash: getComputedStyle(path).strokeDasharray })), appearance,
    'После reload сохраняется вид линии, а не только данные в localStorage')

  // Переподключение сохраняет стиль и заново рисует путь от нового конца.
  const originalPath = await edge().locator('.react-flow__edge-path').getAttribute('d')
  await edge().click()
  const target = page.getByRole('combobox', { name: 'Конец связи', exact: true })
  await target.click()
  await target.fill('Северная')
  const reconnectAnimation = await page.getByRole('option', { name: initial.entities[2].name, exact: true }).evaluate(option => {
    option.click()
    return new Promise(resolve => requestAnimationFrame(() => {
      const connection = document.querySelector('.react-flow__edge[data-id="note-quest"]')
      resolve(connection?.getAnimations({ subtree: true }).some(animation => animation.playState === 'running' && animation.animationName?.includes('connectionDraw')))
    }))
  })
  assert.equal(reconnectAnimation, true, 'Переподключённая связь рисуется заново')
  assert.equal((await saved()).diagrams[0].edges[0].target, 'location')
  assert.notEqual(await edge().locator('.react-flow__edge-path').getAttribute('d'), originalPath)
  await closeInspector()
  await page.locator('[data-departing-connections]').waitFor({ state: 'detached' })
  await page.keyboard.press('Control+z')
  assert.deepEqual((await saved()).diagrams[0].edges, styled.diagrams[0].edges, 'Undo переподключения восстанавливает адрес и оформление')
  await page.locator('[data-departing-connections]').waitFor({ state: 'detached' })

  await edge().click()
  const departure = await clickWithDeparture(page.getByRole('button', { name: 'Удалить связь', exact: true }))
  assert.ok(departure?.running, 'После удаления остаётся анимированный снимок связи')
  assert.equal(departure.path, originalPath)
  assert.equal(departure.stroke, appearance.stroke, 'Снимок сохраняет цвет удалённой связи')
  assert.equal((await saved()).diagrams[0].edges.length, 0, 'Документ удаляет связь сразу, до окончания анимации')
  await page.locator('[data-departing-connections]').waitFor({ state: 'detached' })
  await closeInspector()
  await page.keyboard.press('Control+z')
  assert.deepEqual((await saved()).diagrams[0].edges, styled.diagrams[0].edges, 'Undo удаления восстанавливает оформленную связь')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await node('note').hover()
  await node('note').getByRole('button', { name: /^Соединить справа:/ }).click()
  await node('location').hover()
  await page.getByRole('status').filter({ hasText: 'Выберите второй узел' }).waitFor()
  await noMotion(page.locator('.react-flow'))
  await page.keyboard.press('Escape')
  assert.equal((await saved()).diagrams[0].edges.length, 1, 'Escape отменяет предпросмотр без изменения документа')
  assert.equal(await page.locator('[data-departing-connections]').count(), 0, 'При reduced-motion отмена связи обходится без анимационного снимка')
  await page.emulateMedia({ reducedMotion: null })
  await settleEdge()
  const collapseLibrary = page.getByRole('button', { name: 'Свернуть библиотеку', exact: true })
  if (await collapseLibrary.count()) await collapseLibrary.click()
  await page.locator('.react-flow__pane').click({ position: { x: 1200, y: 700 } })
  await page.screenshot({ path: join(tmpdir(), 'campaign-appearance-styled-edge.png') })
  assert.deepEqual(errors, [])
  console.log('Оформление карты: 9 resize-жестов, квадратный загиб, границы содержимого, undo/redo, цвет/формат связи, анимации переподключения/удаления, reload и reduced-motion — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'campaign-appearance-failure.png'), fullPage: true })
  console.error('Browser errors:', errors)
  throw error
} finally { await browser.close() }
