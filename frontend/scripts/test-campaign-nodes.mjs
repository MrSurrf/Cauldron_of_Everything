// Девять представлений, контурные связи и общая Entity на разных схемах.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const key = 'cauldron.campaign-table.v2'
const types = ['playerCharacter', 'npc', 'creature', 'location', 'quest', 'faction', 'item', 'spell', 'note']
const names = ['Элора', 'Боромир', 'Кровавый волк', 'Чёрный Предел', 'Тени в подземелье', 'Златокрылые', 'Зелье исцеления', 'Огненный шар', 'Странная руна']
const facts = ['Плут · Ур. 5', 'Трактирщик', 'ПО 4 · Зверь · Средний', '', '', 'Торговый союз', 'Необычный · 50 зм', 'Уровень 3 · Эвокация', '']
const entities = types.map((entityType, i) => ({ id: `entity-${entityType}`, slug: entityType, entityType, name: names[i], facts: facts[i], state: '',
  description: entityType === 'location' ? 'Город-крепость' : entityType === 'quest' ? 'Исследовать подземелье под городом' : entityType === 'note' ? 'Та же символика встречалась в руинах к северу от города…' : '' }))
const nodes = types.map((type, i) => ({ id: type, type: ['location', 'note'].includes(type) ? type : 'entity',
  position: { x: 70 + i % 3 * 380, y: 50 + Math.floor(i / 3) * 270 }, data: { entityId: `entity-${type}` } }))
const initial = { version: 3, activeId: 'first', entities, layout: { libraryWidth: 336, inspectorWidth: 380, section: 'creature', query: '' },
  diagrams: [
    { id: 'first', name: 'Основная схема', nodes, viewport: { x: 0, y: 0, zoom: 1 }, edges: [
      { id: 'characters', source: 'playerCharacter', target: 'npc', label: 'Знакомы' },
      { id: 'quest-location', source: 'quest', target: 'location', label: 'Ведёт в' },
      { id: 'spell-item', source: 'spell', target: 'item' },
      { id: 'creature-faction', source: 'creature', target: 'faction' },
    ] },
    { id: 'second', name: 'Вторая схема', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  ] }
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'test-token'))
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  return route.fulfill({ json: path === '/api/auth/session/' ? { authenticated: true } : { count: 0, results: [] } })
})
const node = type => page.locator(`.react-flow__node[data-id="${type}"]`)
async function saved() { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key) }
async function menu(type) { await node(type).getByRole('heading').click({ button: 'right' }) }
async function scheme(name) {
  await page.getByRole('button', { name: /^Выбрать схему:/ }).click()
  await page.getByRole('navigation', { name: 'Выбор схемы' }).getByRole('button', { name: new RegExp(name) }).click()
}
async function moveNode(type, dx, dy) {
  const rect = await node(type).boundingBox()
  await page.mouse.move(rect.x + rect.width / 2, rect.y + 65)
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + dx, rect.y + 65 + dy, { steps: 20 }); await page.mouse.up()
}
try {
  await page.goto(`${process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'}/my-table`)
  await page.evaluate(({ key, initial }) => localStorage.setItem(key, JSON.stringify(initial)), { key, initial })
  await page.reload()
  await page.getByRole('button', { name: 'Свернуть библиотеку' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.react-flow__node').length === 9)
  for (const type of types) {
    assert.equal(await node(type).locator('article').getAttribute('data-entity-type'), type)
    assert.equal(await node(type).locator('.react-flow__handle').first().evaluate(el => getComputedStyle(el).opacity), '0')
    assert.equal(await node(type).getByRole('button', { name: /^Соединить / }).count(), 4)
  }
  assert.equal(await node('playerCharacter').locator('circle').count(), 1)
  assert.equal(await node('npc').locator('circle').count(), 1)
  assert.equal(await node('spell').locator('article').getAttribute('data-shape'), 'diamond')
  assert.ok((await node('location').boundingBox()).height < 220)
  assert.ok((await node('note').boundingBox()).height < 210)
  assert.equal(await node('location').locator('img').evaluate(image => image.complete && image.naturalWidth > 0), true)
  assert.equal(await node('spell').getByLabel('Уровень заклинания: 3').textContent(), '3')
  assert.equal(await node('faction').locator('svg path').count(), 0)
  assert.equal(await node('npc').getByText('NPC', { exact: true }).count(), 0)
  for (const type of ['playerCharacter', 'npc', 'creature', 'spell', 'item', 'faction']) {
    await node(type).getByRole('heading').click()
    assert.equal(await node(type).locator('.react-flow__resize-control').count(), 0)
    assert.equal(await node(type).evaluate(element => getComputedStyle(element).outlineStyle), 'none')
    const inspectorClose = page.getByRole('button', { name: 'Закрыть Inspector' })
    await (await inspectorClose.count() ? inspectorClose : page.getByRole('button', { name: 'Закрыть карточку' })).click()
  }
  await node('quest').getByRole('heading').click()
  await page.getByRole('button', { name: 'Закрыть Inspector' }).click()
  await node('quest').getByRole('heading').click()
  const resizeHandle = node('quest').locator('.react-flow__resize-control.bottom.right.handle')
  const hitbox = await resizeHandle.boundingBox()
  assert.ok(hitbox.width >= 24 && hitbox.height >= 24, JSON.stringify({ hitbox, style: await resizeHandle.getAttribute('style') }))
  assert.equal(await node('quest').locator('.react-flow__resize-control.line').first().evaluate(el => getComputedStyle(el).borderTopWidth), '0px')
  await page.getByRole('button', { name: 'Закрыть Inspector' }).click()
  await node('faction').getByRole('heading').dblclick()
  await page.getByRole('region', { name: 'Редактор Entity' }).waitFor()
  await page.getByRole('tab', { name: 'Основная схема', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть Inspector' }).click()
  await page.mouse.move(1550, 970)
  await page.waitForFunction(() => document.querySelector('[data-cursor-light-background]')?.style.getPropertyValue('--cursor-light-active') === '1')
  assert.equal(await node('location').getByRole('button', { name: /^Соединить справа:/ }).evaluate(el => getComputedStyle(el).opacity), '0')
  await node('location').hover()
  assert.equal(await node('location').getByRole('button', { name: /^Соединить справа:/ }).evaluate(el => getComputedStyle(el).opacity), '1')
  await page.screenshot({ path: join(tmpdir(), 'campaign-hover-ports.png') })
  await page.mouse.move(1550, 970)
  await page.screenshot({ path: join(tmpdir(), 'campaign-node-types.png') })

  // Круглые узлы: горизонтальное присоединение; движение перестраивает обе точки.
  const edge = page.locator('.react-flow__edge[data-id="characters"] .react-flow__edge-path')
  const horizontal = await edge.getAttribute('d')
  assert.deepEqual(horizontal.match(/-?\d+(?:\.\d+)?/g).map(Number), [220, 110, 480, 110])
  await moveNode('npc', 0, 120)
  const moved = await edge.getAttribute('d')
  assert.notEqual(moved, horizontal)
  const points = moved.match(/-?\d+(?:\.\d+)?/g).map(Number)
  assert.ok(Math.abs(Math.hypot(points[0] - 160, points[1] - 110) - 60) < 0.01)
  const npcPosition = (await saved()).diagrams[0].nodes.find(node => node.id === 'npc').position
  assert.ok(Math.abs(Math.hypot(points[2] - (npcPosition.x + 90), points[3] - (npcPosition.y + 60)) - 60) < 0.01,
    JSON.stringify({ points, npcPosition }))
  await page.keyboard.press('Control+z')
  assert.deepEqual((await saved()).diagrams[0].nodes.find(item => item.id === 'npc').position, { x: 450, y: 50 })
  await page.keyboard.press('Control+Shift+z')
  assert.deepEqual((await saved()).diagrams[0].nodes.find(item => item.id === 'npc').position, npcPosition)
  // В поле текста работают собственные команды редактора, не история графа.
  await node('npc').getByRole('heading').click()
  await page.getByRole('textbox', { name: 'Название Entity' }).fill('Новое имя NPC')
  await page.keyboard.press('Control+z')
  assert.deepEqual((await saved()).diagrams[0].nodes.find(item => item.id === 'npc').position, npcPosition)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Закрыть Inspector' }).click()
  await page.keyboard.press('Meta+z')
  assert.deepEqual((await saved()).diagrams[0].nodes.find(item => item.id === 'npc').position, { x: 450, y: 50 })
  await page.keyboard.press('Meta+Shift+z')
  assert.deepEqual((await saved()).diagrams[0].nodes.find(item => item.id === 'npc').position, npcPosition)

  // Режим связи: подсветка и точка предпросмотра, отмена без ребра.
  // Любая из четырёх точек запускает общий режим и не двигает ноду.
  for (const side of ['сверху', 'справа', 'снизу', 'слева']) {
    const position = (await saved()).diagrams[0].nodes.find(item => item.id === 'creature').position
    await node('creature').hover()
    await node('creature').getByRole('button', { name: `Соединить ${side}: Кровавый волк`, exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Выберите второй узел' }).waitFor()
    assert.deepEqual((await saved()).diagrams[0].nodes.find(item => item.id === 'creature').position, position)
    await page.keyboard.press('Escape')
  }
  await node('creature').hover()
  await node('creature').getByRole('button', { name: /^Соединить снизу:/ }).click()
  await node('spell').hover()
  assert.equal(await node('spell').locator('article').getAttribute('data-connecting'), 'true')
  await page.getByRole('status').filter({ hasText: 'Выберите второй узел' }).waitFor()
  await page.screenshot({ path: join(tmpdir(), 'campaign-contour-preview.png') })
  await page.keyboard.press('Escape')
  assert.equal((await saved()).diagrams[0].edges.length, 4)
  await node('creature').hover()
  await node('creature').getByRole('button', { name: /^Соединить слева:/ }).click()
  await node('spell').hover()
  await node('spell').getByRole('button', { name: /^Соединить справа:/ }).click()
  assert.equal((await saved()).diagrams[0].edges.length, 5)
  await page.keyboard.press('Control+z')
  assert.equal((await saved()).diagrams[0].edges.length, 4)
  await page.keyboard.press('Control+Shift+z')
  assert.equal((await saved()).diagrams[0].edges.length, 5)

  // Прямое удаление иконкой, восстановление ноды вместе со связями.
  await node('creature').hover()
  await node('creature').getByRole('button', { name: /^Удалить со схемы:/ }).click()
  assert.equal((await saved()).diagrams[0].nodes.length, 8)
  await page.keyboard.press('Control+z')
  assert.equal((await saved()).diagrams[0].nodes.length, 9)
  assert.equal((await saved()).diagrams[0].edges.length, 5)

  // Одна Entity на двух схемах, правки названия общие, геометрия независимая.
  await menu('location')
  await node('location').getByRole('combobox', { name: 'Разместить Entity на схеме' }).selectOption('second')
  let state = await saved()
  assert.equal(state.entities.length, 9)
  assert.equal(state.diagrams[1].nodes[0].data.entityId, 'entity-location')
  await scheme('Вторая схема')
  await page.getByRole('heading', { name: 'Чёрный Предел', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название Entity' }).fill('Белый Предел')
  await page.getByRole('textbox', { name: 'Название Entity' }).press('Enter')
  await page.getByRole('button', { name: 'Закрыть Inspector' }).click()
  await scheme('Основная схема')
  await node('location').getByRole('heading', { name: 'Белый Предел' }).waitFor()
  assert.deepEqual((await saved()).diagrams[0].nodes.find(item => item.id === 'location').position, { x: 70, y: 320 })
  await scheme('Вторая схема')
  await page.getByRole('heading', { name: 'Белый Предел' }).click()
  await page.keyboard.press('Delete')
  state = await saved()
  assert.equal(state.diagrams[1].nodes.length, 0)
  assert.equal(state.entities.length, 9)
  assert.equal(state.diagrams[0].nodes.length, 9)
  await page.reload()
  assert.deepEqual(await saved(), state)
  await scheme('Основная схема')
  await node('location').getByRole('heading', { name: 'Белый Предел' }).waitFor()
  assert.deepEqual(errors, [])
  console.log('Девять форм, скрытые якоря, контур при движении, режим связи, общая Entity, удаление размещения и reload — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'campaign-nodes-failure.png'), fullPage: true })
  console.error(errors)
  throw error
} finally { await browser.close() }
