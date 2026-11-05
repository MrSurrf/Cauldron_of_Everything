// Все девять видов: библиотека, drag preview, перенос, reload и старые ссылки.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { chooseCombobox } from './choose-combobox.mjs'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v2'
const kinds = [
  ['wand', 'Волшебная палочка'], ['armor', 'Доспех (латы)'], ['scroll', 'Свиток'],
  ['potion', 'Зелье'], ['ring', 'Кольцо'], ['wondrous', 'Магическая безделушка'],
  ['staff', 'Посох'], ['rod', 'Жезл'], ['weapon', 'Оружие (длинный меч)'],
]
const entries = kinds.map(([kind, classification], index) => ({
  id: 900 + index, entity_type: 'item', slug: kind, name: `Предмет ${kind}`, name_en: '',
  summary: { classification, rarity: 'Редкий' },
}))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } })
const errors = []
const detailRequests = new Map()
const publicRequests = []
let publicDocument
let watchingPublic = false
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'item-icons-test-token'))
await page.route('**/api/**', async route => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (watchingPublic) publicRequests.push(url.pathname)
  if (url.pathname === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (url.pathname === '/api/encyclopedia/') {
    const results = url.searchParams.get('type') === 'item' ? entries : []
    return route.fulfill({ json: { count: results.length, results } })
  }
  const entry = entries.find(value => url.pathname === `/api/encyclopedia/${value.id}/`)
  if (entry) {
    detailRequests.set(entry.id, (detailRequests.get(entry.id) || 0) + 1)
    return route.fulfill({ json: { ...entry, data: entry.summary, content_html: '<p>Описание предмета</p>' } })
  }
  if (url.pathname === '/api/campaigns/items/table/public/') {
    return route.fulfill({ json: { visibility: 'public', document: publicDocument } })
  }
  return route.fulfill({ status: 404, json: {} })
})
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
const nodeFor = name => page.locator('.react-flow__node').filter({ has: page.getByRole('heading', { name, exact: true }) })

try {
  await page.goto(`${baseUrl}/my-table`)
  await chooseCombobox(page, 'Раздел библиотеки', 'Магические предметы')
  const canvas = page.locator('.react-flow')
  for (const [index, [kind]] of kinds.entries()) {
    const source = page.getByRole('button', { name: `Открыть: Предмет ${kind}`, exact: true })
    const icon = source.locator(`[data-icon="item-${kind}"]`)
    await icon.waitFor()
    const size = await icon.boundingBox()
    assert.ok(size.width >= 30 && size.height >= 30, `Иконка ${kind} должна заполнять место в списке`)
    await source.dispatchEvent('dragstart', { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) })
    const preview = page.locator(`[data-library-drag-preview] [data-icon="item-${kind}"]`)
    await preview.waitFor()
    const previewSize = await preview.boundingBox()
    assert.ok(previewSize.width >= 27 && previewSize.height >= 27)
    await source.dispatchEvent('dragend')
    await source.dragTo(canvas, { targetPosition: { x: 40 + (index % 5) * 190, y: 90 + Math.floor(index / 5) * 260 } })
    const nodeIcon = nodeFor(`Предмет ${kind}`).locator(`[data-icon="item-${kind}"]`)
    await nodeIcon.waitFor()
    const nodeSize = await nodeIcon.boundingBox()
    assert.ok(nodeSize.width >= 80 && nodeSize.height >= 80, `Иконка ${kind} должна заполнять badge ноды`)
  }
  assert.equal(detailRequests.size, 0, 'Новые ссылки уже содержат вид и не загружают оригиналы')
  let state = await saved()
  for (const [index, [, classification]] of kinds.entries()) {
    assert.equal(state.entities[index].reference.classification, classification)
  }
  publicDocument = structuredClone(state)
  await page.reload()
  for (const [kind] of kinds) await nodeFor(`Предмет ${kind}`).locator(`[data-icon="item-${kind}"]`).waitFor()

  // Старая ссылка и два размещения одной Entity должны делить единственный запрос.
  state = await saved()
  for (const entity of state.entities) delete entity.reference.classification
  const first = state.diagrams[0].nodes[0]
  state.diagrams[0].nodes.push({ ...structuredClone(first), id: 'old-item-second-placement', position: { x: 950, y: 350 } })
  await page.evaluate(({ key, document }) => localStorage.setItem(key, JSON.stringify(document)), { key: storageKey, document: state })
  await page.reload()
  for (const [kind] of kinds) await nodeFor(`Предмет ${kind}`).first().locator(`[data-icon="item-${kind}"]`).waitFor()
  await page.locator('.react-flow__node[data-id="old-item-second-placement"] [data-icon="item-wand"]').waitFor()
  for (const entry of entries) assert.equal(detailRequests.get(entry.id), 1, `Оригинал ${entry.slug} запрашивается один раз`)
  assert.ok((await saved()).entities.every(entity => entity.reference.classification === undefined), 'Lookup не меняет старый документ')

  // Локальная правка классификации приоритетнее типа оригинала.
  state = await saved()
  state.entities[0].statBlock = { kind: 'item', entry: { ...entries[0], data: { classification: 'Кольцо' } } }
  await page.evaluate(({ key, document }) => localStorage.setItem(key, JSON.stringify(document)), { key: storageKey, document: state })
  await page.reload()
  await nodeFor('Предмет wand').first().locator('[data-icon="item-ring"]').waitFor()
  await page.locator('.react-flow__node[data-id="old-item-second-placement"] [data-icon="item-ring"]').waitFor()
  assert.equal(detailRequests.get(entries[0].id), 1, 'Локальный статблок не требует запроса оригинала')

  watchingPublic = true
  await page.goto(`${baseUrl}/my-table?table=public&campaign=items`)
  for (const [kind] of kinds) await nodeFor(`Предмет ${kind}`).locator(`[data-icon="item-${kind}"]`).waitFor()
  assert.ok(publicRequests.every(path => ['/api/auth/session/', '/api/campaigns/items/table/public/'].includes(path)), 'Публичные ноды не догружают оригиналы')
  assert.deepEqual(errors, [])
  console.log('Иконки предметов: 9 видов, библиотека, drag preview, перенос, сохранение, reload, старые ссылки, локальный статблок и public — OK.')
} finally {
  await browser.close()
}
