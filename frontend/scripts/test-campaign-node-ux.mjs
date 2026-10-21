// Реальные жесты на изолированной схеме; все HTTP API подменены, БД не меняется.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const key = 'cauldron.campaign-table.v2'
const types = ['playerCharacter', 'npc', 'item', 'spell', 'location', 'quest']
const names = ['Элора', 'Трактирщик', 'Щит', 'Огненный шар', 'Замок', 'Найти караван']
const initial = { version: 3, activeId: 'ux', layout: { libraryWidth: 336, inspectorWidth: 380, section: 'item', query: '' },
  entities: types.map((entityType, i) => ({ id: `entity-${entityType}`, slug: entityType, entityType, name: names[i], facts: '', description: '', state: '' })),
  diagrams: [{ id: 'ux', name: 'UX', viewport: { x: 0, y: 0, zoom: 1 }, edges: [],
    nodes: types.map((type, i) => ({ id: type, type: type === 'location' ? 'location' : 'entity',
      position: { x: 80 + Math.floor(i / 2) * 380, y: 70 + i % 2 * 330 }, data: { entityId: `entity-${type}` } })),
  }] }
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } })
page.setDefaultTimeout(12000)
const errors = []
let failItemDetails = false
const libraryItem = { id: 101, entity_type: 'item', name: 'Меч из библиотеки', name_en: 'Sword', slug: 'sword',
  summary: { rarity: 'Обычный' }, data: { rarity: 'Обычный', cost: '10 зм' }, content_text: 'Обычный меч.' }
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'ux-fixture'))
await page.route(url => url.pathname.startsWith('/api/'), route => {
  const url = new URL(route.request().url())
  if (url.pathname === '/api/encyclopedia/101/') return route.fulfill({ status: failItemDetails ? 503 : 200, json: libraryItem })
  if (url.pathname === '/api/encyclopedia/' && url.searchParams.get('type') === 'item') return route.fulfill({ json: { count: 1, results: [libraryItem] } })
  return route.fulfill({ json: url.pathname.endsWith('/auth/session/') ? { authenticated: true } : { count: 0, results: [] } })
})
const node = id => page.locator(`.react-flow__node[data-id="${id}"]`)
const port = id => node(id).locator('[data-side="right"]')
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const equipment = table => table.entities.find(entity => entity.id === 'entity-playerCharacter').statBlock.document.equipmentContentText
const center = rect => ({ x: rect.x + rect.width / 2, y: rect.y + Math.min(60, rect.height / 2) })
async function reset(table = initial) {
  await page.evaluate(({ key, table }) => localStorage.setItem(key, JSON.stringify(table)), { key, table })
  await page.reload()
  await page.getByRole('button', { name: 'Свернуть библиотеку' }).click()
  await node('quest').waitFor()
}
async function startNodeDrag(id, target) {
  const start = center(await node(id).boundingBox())
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 25 })
}
async function waitInside(id, parent) {
  await page.waitForFunction(({ key, id, parent }) => {
    const node = JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.find(node => node.id === id)
    return (node.data.containerId ?? node.data.locationId ?? null) === parent
  }, { key, id, parent })
}
try {
  await page.goto(`${process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'}/my-table`)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await reset()

  // Порт лежит на реальной окружности, а не на прямоугольнике подписи.
  const geometry = await node('playerCharacter').evaluate(element => {
    const shape = element.querySelector('svg[class*="nodeOutline"]').getBoundingClientRect()
    const port = element.querySelector('[data-side="right"]').getBoundingClientRect()
    return { shape: { x: shape.x, y: shape.y, w: shape.width, h: shape.height },
      port: { x: port.x + port.width / 2, y: port.y + port.height / 2, w: port.width } }
  })
  assert.ok(Math.abs(geometry.port.x - (geometry.shape.x + geometry.shape.w)) < 1)
  assert.ok(Math.abs(geometry.port.y - (geometry.shape.y + geometry.shape.h / 2)) < 1)
  assert.equal(geometry.port.w, 32)

  // Click → click, без перемещения источника.
  await node('playerCharacter').hover()
  await port('playerCharacter').click()
  await node('quest').getByRole('heading').click()
  assert.equal((await saved()).diagrams[0].edges.length, 1)
  assert.deepEqual((await saved()).diagrams[0].nodes[0].position, initial.diagrams[0].nodes[0].position)
  await page.keyboard.press('Control+z')

  // Drag → release на всей ноде, не обязательно на её порте.
  await node('playerCharacter').hover()
  const p = await port('playerCharacter').boundingBox(), target = center(await node('quest').boundingBox())
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2)
  await page.mouse.down(); await page.mouse.move(target.x, target.y, { steps: 25 }); await page.mouse.up()
  assert.equal((await saved()).diagrams[0].edges.length, 1)
  assert.equal(await page.locator('[class*="connectionMode"]').count(), 0)
  await page.keyboard.press('Control+z')
  assert.equal((await saved()).diagrams[0].edges.length, 0)
  await node('npc').hover(); await port('npc').click(); await page.keyboard.press('Escape')
  assert.equal((await saved()).diagrams[0].edges.length, 0)

  // При переходе к действиям нет исчезновения в зазоре.
  const a = await node('npc').locator('article').boundingBox()
  const action = node('npc').getByRole('button', { name: /^Редактировать:/ })
  const b = await action.boundingBox()
  for (let y = a.y + 12; y >= b.y + b.height / 2; y--) {
    await page.mouse.move(b.x + b.width / 2, y)
    assert.equal(await action.evaluate(el => getComputedStyle(el).pointerEvents), 'auto')
  }
  const canvasWidth = (await page.locator('.react-flow').boundingBox()).width
  await node('quest').getByRole('heading').click()
  assert.equal((await page.locator('.react-flow').boundingBox()).width, canvasWidth)
  await node('playerCharacter').getByRole('heading').click()
  assert.equal((await page.locator('.react-flow').boundingBox()).width, canvasWidth)
  await page.mouse.click(1150, 1030)

  for (let i = 0; i < 4; i++) { await page.locator('.react-flow__controls-zoomout').click(); await page.waitForTimeout(220) }
  assert.ok(Math.abs((await port('playerCharacter').boundingBox()).width - 32) < 0.1)
  await reset()

  // Предпросмотр помещения предмета в чарлист и единый Undo/Redo.
  await startNodeDrag('item', center(await node('playerCharacter').boundingBox()))
  assert.equal(await node('playerCharacter').locator('article').getAttribute('data-drop-target'), 'true')
  await page.getByRole('status').filter({ hasText: 'Поместить внутрь: Элора' }).waitFor()
  await page.screenshot({ path: join(tmpdir(), 'campaign-inventory-drop-preview.png') })
  await page.mouse.up()
  await waitInside('item', 'playerCharacter')
  assert.ok(equipment(await saved()).includes(':::item[Щит]'))
  assert.equal(await node('item').count(), 0)
  await page.keyboard.press('Control+z'); await waitInside('item', null)
  assert.ok(!equipment(await saved()).includes(':::item[Щит]'))
  assert.deepEqual((await saved()).diagrams[0].nodes.find(node => node.id === 'item').position, initial.diagrams[0].nodes.find(node => node.id === 'item').position)
  await page.keyboard.press('Control+Shift+z'); await waitInside('item', 'playerCharacter')
  assert.equal((equipment(await saved()).match(/:::item\[/g) ?? []).length, 1)
  const contained = await saved()
  await reset(contained)
  assert.equal(await node('item').count(), 0)
  await node('playerCharacter').getByRole('button', { name: 'Содержимое: 1' }).click()
  await node('playerCharacter').getByRole('button', { name: /^Извлечь:/ }).click()
  await waitInside('item', null)
  assert.ok(!equipment(await saved()).includes(':::item[Щит]'))

  // Локация тоже принимает предметы с тем же явным предпросмотром.
  await startNodeDrag('item', center(await node('location').boundingBox()))
  await page.getByRole('status').filter({ hasText: 'Поместить внутрь: Замок' }).waitFor()
  await page.mouse.up(); await waitInside('item', 'location')
  await page.keyboard.press('Control+z'); await waitInside('item', null)

  // Перенос в настоящее поле снаряжения открытого чарлиста.
  await node('playerCharacter').getByRole('heading').click()
  const equipmentSlot = page.locator('[data-campaign-panel="inspector"] [data-character-sheet-slot="equipment"]')
  await equipmentSlot.scrollIntoViewIfNeeded()
  const slot = await equipmentSlot.boundingBox()
  await startNodeDrag('item', { x: slot.x + slot.width / 2, y: slot.y + slot.height / 2 })
  assert.equal(await page.locator('[data-campaign-panel="inspector"]').getAttribute('data-inventory-drop-target'), 'true')
  await page.mouse.up(); await waitInside('item', 'playerCharacter')
  assert.ok(equipment(await saved()).includes(':::item[Щит]'))
  // Нативный DnD библиотеки использует тот же контракт, а ошибка API не теряет предметы.
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click()
  const libraryEntry = page.getByRole('button', { name: 'Открыть: Меч из библиотеки', exact: true })
  await libraryEntry.dragTo(node('playerCharacter'), { targetPosition: { x: 90, y: 60 } })
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).diagrams[0].nodes.some(node => node.data.containerId === 'playerCharacter' && node.id !== 'item'), key)
  assert.ok(equipment(await saved()).includes(':::item[Меч из библиотеки]'))
  await page.keyboard.press('Control+z')
  assert.ok(!equipment(await saved()).includes(':::item[Меч из библиотеки]'))
  const beforeFailure = await saved()
  failItemDetails = true
  await libraryEntry.dragTo(node('playerCharacter'), { targetPosition: { x: 90, y: 60 } })
  await page.getByRole('status').filter({ hasText: 'HTTP 503' }).waitFor()
  assert.deepEqual((await saved()).diagrams[0].nodes, beforeFailure.diagrams[0].nodes)
  assert.equal(equipment(await saved()), equipment(beforeFailure))
  assert.deepEqual(errors, [])
  console.log('Порты на контуре, постоянная зона 32 px, оба жеста связи, стабильные действия/панели, локация и снаряжение со схемы, извлечение, Undo/Redo и reload — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'campaign-node-ux-failure.png'), fullPage: true })
  console.error(errors)
  throw error
} finally { await browser.close() }
