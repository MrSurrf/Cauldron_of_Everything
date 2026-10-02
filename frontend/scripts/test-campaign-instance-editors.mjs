import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } })
const storageKey = 'cauldron.campaign-table.v2'
const errors = [], methods = []
let offline = false, characterDocument
const originals = [
  { id: 1, name: 'Страж', name_en: 'Guard', entity_type: 'creature', slug: 'guard', data: { armor_class: 13, hit_points: '20 (4к8)', speed: '30 фт.', challenge_rating: '1', creature_type: 'Гуманоид', abilities: { strength: 15 }, actions_html: '<p><strong>Удар.</strong> 5 урона.</p>' } },
  { id: 2, name: 'Луч', name_en: 'Ray', entity_type: 'spell', slug: 'ray', data: { level: 1, school: 'Эвокация', duration: 'Мгновенная', description_html: '<p>Оригинальная магия.</p>' }, content_html: '<p>Оригинальная магия.</p>' },
  { id: 3, name: 'Кольцо', name_en: 'Ring', entity_type: 'item', slug: 'ring', data: { rarity: 'Редкий', cost: '100 зм' }, content_html: '<p>Оригинальный предмет.</p>' },
  ...['class', 'race', 'background', 'feat', 'reference'].map((entity_type, i) => ({ id: i + 10, name: entity_type, name_en: '', slug: entity_type, entity_type, data: {} })),
]
const unchanged = structuredClone(originals)
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'test-token'))
await page.route('**/api/**', async route => {
  methods.push(route.request().method())
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) { methods.pop(); return route.continue() }
  if (url.pathname === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (offline && url.pathname !== '/api/encyclopedia/') return route.fulfill({ status: 503, json: {} })
  if (url.pathname === '/api/encyclopedia/') {
    const results = originals.filter(entry => entry.entity_type === url.searchParams.get('type'))
    return route.fulfill({ json: { count: results.length, results: results.map(entry => ({ ...entry, summary: entry.data })) } })
  }
  const original = originals.find(entry => url.pathname === `/api/encyclopedia/${entry.id}/`)
  if (original) return route.fulfill({ json: original })
  if (url.pathname === '/api/characters/hero/') return route.fulfill({ json: { id: 'hero', name: 'Герой', slug: 'hero', entityType: 'character', facts: [], description: '', document: characterDocument } })
  return route.fulfill({ json: { count: 0, results: [] } })
})
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
const node = id => page.locator(`.react-flow__node[data-id="${id}"]`)
const close = async () => { const button = page.getByRole('button', { name: 'Закрыть карточку', exact: true }); if (await button.count()) await button.click() }
async function edit(id) { await close(); await node(id).hover(); await node(id).getByRole('button', { name: /^Редактировать:/ }).click() }
try {
  await page.goto(`${process.env.TABLE_TEST_URL || 'http://127.0.0.1:5174'}/my-table`)
  characterDocument = await page.evaluate(async () => {
    const { createEmptyCharacterSheet } = await import('/src/tools/character-sheet/index.ts')
    const document = createEmptyCharacterSheet(); document.identity.name = 'Герой'; return document
  })
  const entities = originals.slice(0, 3).map(entry => ({ id: `e${entry.id}`, slug: entry.slug, entityType: entry.entity_type, name: entry.name, description: '', facts: '', state: 'Старое скрытое состояние',
    reference: { source: 'encyclopedia', entityId: String(entry.id), entityType: entry.entity_type, name: entry.name, slug: entry.slug, facts: [] } }))
  entities.push({ id: 'hero', slug: 'hero', entityType: 'playerCharacter', name: 'Герой', description: '', facts: '', state: '',
    reference: { source: 'character', entityId: 'hero', entityType: 'character', name: 'Герой', slug: 'hero', facts: [] } })
  const document = { version: 3, activeId: 'd', entities, layout: { libraryWidth: 336, inspectorWidth: 700, section: 'creature', query: '' }, diagrams: [{ id: 'd', name: 'Схема', viewport: { x: 0, y: 0, zoom: 1 }, edges: [],
    nodes: entities.map((entity, i) => ({ id: entity.id, type: 'entity', data: { entityId: entity.id }, position: { x: 40 + i % 2 * 280, y: 40 + Math.floor(i / 2) * 270 } })) }] }
  await page.evaluate(({ key, document }) => localStorage.setItem(key, JSON.stringify(document)), { key: storageKey, document })
  await page.reload()
  assert.equal(await page.locator('#library-results').evaluate(viewport => getComputedStyle(viewport).scrollbarWidth), 'none')
  assert.equal(await page.getByText('Старое скрытое состояние', { exact: true }).count(), 0)

  await edit('e1')
  const panelViewport = page.getByRole('region', { name: 'Карточка и редактор', exact: true })
  assert.equal(await panelViewport.evaluate(viewport => getComputedStyle(viewport).scrollbarWidth), 'none')
  await page.getByRole('slider', { name: 'Вертикальная прокрутка: Карточка и редактор', exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Хиты', exact: true }).fill('99 (12к8)')
  await page.getByText('Характеристики, спасброски и навыки', { exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Характеристики: Сила: Значение', exact: true }).fill('20')
  await page.getByText('Умения, действия и описание', { exact: true }).click()
  await page.getByRole('textbox', { name: 'Разделы статблока: 1: Заголовок', exact: true }).fill('Новые действия')
  assert.equal((await saved()).entities[0].statBlock.entity.abilities.strength.score, 20)
  await close()

  await edit('e2')
  await page.getByRole('spinbutton', { name: 'Уровень', exact: true }).fill('5')
  await page.getByRole('textbox', { name: 'Длительность', exact: true }).fill('1 минута')
  await page.getByRole('textbox', { name: 'Полное содержимое карточки', exact: true }).fill('Изменённая магия.')
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Новый луч')
  await close()
  await node('e2').getByRole('heading').dblclick()
  await page.getByRole('complementary', { name: 'Карточка и редактор' }).getByText('Изменённая магия.', { exact: true }).first().waitFor()
  await close()

  await edit('e3')
  await page.getByRole('textbox', { name: 'Редкость', exact: true }).fill('Легендарный')
  await page.getByRole('textbox', { name: 'Стоимость', exact: true }).fill('500 зм')
  await page.getByRole('textbox', { name: 'Полное содержимое карточки', exact: true }).fill('Свойства локального кольца.')
  await page.getByRole('textbox', { name: 'Название экземпляра', exact: true }).fill('Новое кольцо')
  await close()

  await edit('hero')
  const sheetViewport = page.locator('[aria-label="Лист персонажа"][tabindex]')
  await sheetViewport.waitFor()
  const geometry = await sheetViewport.evaluate(viewport => ({ client: viewport.clientWidth, content: viewport.scrollWidth, bottom: viewport.getBoundingClientRect().bottom, panelBottom: viewport.closest('aside').getBoundingClientRect().bottom }))
  assert.ok(geometry.content > geometry.client, 'Исходный широкий лист должен прокручиваться, а не перестраиваться')
  assert.ok(geometry.bottom <= geometry.panelBottom, 'Прокрутка листа должна быть доступна внутри панели')
  const horizontalScroll = page.getByRole('slider', { name: 'Горизонтальная прокрутка: Лист персонажа', exact: true })
  await horizontalScroll.waitFor()
  await horizontalScroll.press('End')
  await page.waitForFunction(() => {
    const viewport = document.querySelector('[aria-label="Лист персонажа"][tabindex]')
    return viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1
  })
  await horizontalScroll.press('Home')
  await page.waitForFunction(() => document.querySelector('[aria-label="Лист персонажа"][tabindex]').scrollLeft < 1)
  await page.getByRole('textbox', { name: 'Имя персонажа', exact: true }).fill('Локальный герой')
  await page.getByRole('textbox', { name: 'Класс', exact: true }).fill('Воин')
  if (process.env.TABLE_TEST_SCREENSHOT) await page.screenshot({ path: process.env.TABLE_TEST_SCREENSHOT })
  assert.equal(characterDocument.identity.name, 'Герой')
  await close()

  // В библиотеке оригиналы прежние; запрещены кнопки добавления и forged DnD.
  for (const type of ['class', 'race', 'background', 'feat', 'reference']) {
    await page.getByRole('combobox', { name: 'Раздел библиотеки' }).selectOption(type)
    const row = page.getByRole('button', { name: `Открыть: ${type}`, exact: true }); await row.waitFor()
    assert.equal(await row.getAttribute('draggable'), 'false')
    assert.equal(await page.getByRole('button', { name: `Добавить на холст: ${type}`, exact: true }).count(), 0)
    await row.click()
    assert.equal(await page.getByRole('button', { name: 'Добавить на холст', exact: true }).count(), 0)
    await close()
    const reference = { source: 'encyclopedia', entityId: '10', entityType: type, name: type, slug: type, facts: [] }
    await page.locator('.react-flow').evaluate((canvas, reference) => {
      const transfer = new DataTransfer(); transfer.setData('application/x-cauldron-entity', JSON.stringify(reference))
      canvas.parentElement.dispatchEvent(new DragEvent('drop', { bubbles: true, clientX: 200, clientY: 300, dataTransfer: transfer }))
    }, reference)
    assert.equal((await saved()).diagrams[0].nodes.length, 4)
  }
  await page.getByRole('combobox', { name: 'Раздел библиотеки' }).selectOption('creature')
  await page.getByRole('button', { name: 'Открыть: Страж', exact: true }).click()
  await page.getByLabel('Класс доспеха 13').waitFor()
  await close()

  const beforeReload = await saved()
  assert.equal(beforeReload.entities[1].statBlock.entry.data.level, 5)
  assert.equal(beforeReload.entities[2].statBlock.entry.data.rarity, 'Легендарный')
  assert.equal(beforeReload.entities[3].statBlock.document.identity.name, 'Локальный герой')
  assert.ok(beforeReload.diagrams[0].nodes.every(node => Object.keys(node.data).every(key => ['entityId', 'locationId'].includes(key))))
  offline = true
  await page.reload()
  await edit('e1'); await page.getByRole('textbox', { name: 'Хиты', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Хиты', exact: true }).inputValue(), '99 (12к8)')
  await close(); await edit('e2')
  assert.equal(await page.getByRole('spinbutton', { name: 'Уровень', exact: true }).inputValue(), '5')
  assert.deepEqual(await saved(), beforeReload)
  assert.deepEqual(originals, unchanged)
  assert.ok(methods.every(method => method === 'GET'))
  assert.deepEqual(errors, [])
  console.log('Полные статблоки, персонаж, оригиналы, ограничение типов, независимость данных и offline reload — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'campaign-instance-editors-failure.png'), fullPage: true })
  console.error(errors); throw error
} finally { await browser.close() }
