import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v2'
const wiki = () => ({ aliases: [], status: '', tags: [], world: '', customProperties: [], sections: [], media: {} })
const document = {
  version: 4,
  activeId: 'north',
  entities: [
    { id: 'keep', slug: 'keep', entityType: 'location', name: 'Старая крепость', description: '', facts: '', state: '', wiki: wiki() },
    { id: 'wardens', slug: 'wardens', entityType: 'faction', name: 'Серые стражи', description: 'Хранители перевала', facts: '', state: '', wiki: wiki() },
    { id: 'hero', slug: 'hero', entityType: 'playerCharacter', name: 'Элиас', description: '', facts: '', state: '', wiki: wiki() },
  ],
  layout: { libraryWidth: 336, inspectorWidth: 520, section: 'creature', query: '' },
  diagrams: [
    { id: 'north', name: 'Север', viewport: { x: 0, y: 0, zoom: 1 }, nodes: [
      { id: 'keep-node', type: 'location', position: { x: 120, y: 100 }, data: { entityId: 'keep' } },
      { id: 'hero-node', type: 'entity', position: { x: 480, y: 220 }, data: { entityId: 'hero' } },
    ], edges: [] },
    { id: 'south', name: 'Юг', viewport: { x: 0, y: 0, zoom: 1 }, nodes: [{ id: 'wardens-node', type: 'entity', position: { x: 240, y: 160 }, data: { entityId: 'wardens' } }], edges: [] },
  ],
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 980 } })
const errors = []
const failedRequests = []
page.on('pageerror', error => errors.push(error.message))
page.on('requestfailed', request => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
await page.addInitScript(({ key, value }) => {
  localStorage.setItem('surveyAuth.access', 'wiki-test-token')
  localStorage.setItem(key, JSON.stringify(value))
}, { key: storageKey, value: document })
await page.route('**/api/**', route => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (url.pathname === '/api/encyclopedia/') return route.fulfill({ json: { count: 0, results: [] } })
  return route.fulfill({ status: 404, json: {} })
})

try {
  await page.goto(`${baseUrl}/my-table`)
  await page.waitForTimeout(2500)
  if (!await page.getByRole('region', { name: 'Схема кампании' }).count()) {
    throw new Error(`Карта не открылась (${[...errors, ...failedRequests].join('; ')}):\n${await page.locator('body').innerHTML()}`)
  }
  const keep = page.locator('.react-flow__node[data-id="keep-node"]')
  await keep.getByRole('heading', { name: 'Старая крепость' }).click()
  const panel = page.getByRole('complementary', { name: 'Wiki-карточка объекта' })
  await panel.waitFor()
  assert.equal(await panel.getByRole('textbox', { name: 'Название страницы' }).inputValue(), 'Старая крепость')

  await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
  assert.equal(await panel.count(), 1, 'клик по пустой карте не должен закрывать wiki-карточку')

  await panel.getByRole('textbox', { name: 'Статус' }).fill('Заброшена')
  await panel.getByRole('button', { name: '+ Новый раздел' }).click()
  await panel.getByRole('textbox', { name: 'Название раздела' }).fill('Тайна мастера')
  await page.waitForFunction(key => {
    const value = JSON.parse(localStorage.getItem(key))
    const entity = value.entities.find(item => item.id === 'keep')
    return entity.wiki.status === 'Заброшена' && entity.wiki.sections[0]?.visibility === 'master'
  }, storageKey)
  if (process.env.WIKI_SCREENSHOT) await page.screenshot({ path: process.env.WIKI_SCREENSHOT, fullPage: true })

  await panel.getByRole('button', { name: '+ Ссылка' }).click()
  await page.getByRole('button', { name: 'Серые стражи' }).click()
  await panel.getByRole('link', { name: 'Серые стражи' }).click()
  await page.getByRole('button', { name: /Выбрать схему: Юг/ }).waitFor()
  assert.equal(await panel.getByRole('textbox', { name: 'Название страницы' }).inputValue(), 'Серые стражи')

  await panel.getByRole('button', { name: 'Назад' }).click()
  await page.getByRole('button', { name: /Выбрать схему: Север/ }).waitFor()
  assert.equal(await panel.getByRole('textbox', { name: 'Название страницы' }).inputValue(), 'Старая крепость')
  await page.keyboard.press('Escape')
  await panel.waitFor({ state: 'detached' })

  await page.locator('.react-flow__node[data-id="hero-node"]').getByRole('heading', { name: 'Элиас' }).click()
  await panel.getByRole('button', { name: 'Открыть полный лист' }).click()
  const characterWorkspace = page.getByRole('region', { name: 'Кампанийный лист персонажа' })
  await characterWorkspace.waitFor()
  assert.equal(await page.locator('section[aria-label="Схема кампании"]').getAttribute('inert'), '', 'карта под полным листом должна быть inert')
  await characterWorkspace.getByRole('button', { name: 'Север', exact: true }).click()
  await characterWorkspace.waitFor({ state: 'detached' })
  assert.equal(await panel.count(), 1, 'после возврата с полного листа wiki-карточка персонажа остаётся открытой')
  assert.deepEqual(errors, [])
  console.log('Wiki-карточка кампании: сохранение, ручное закрытие, ссылки и кампанийный лист — OK.')
} finally {
  await browser.close()
}
