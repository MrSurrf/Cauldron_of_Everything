import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v2'
const wiki = (overrides = {}) => ({ aliases: [], status: '', tags: [], world: '', customProperties: [], sections: [], media: {}, ...overrides })
const document = {
  version: 4,
  activeId: 'north',
  entities: [
    { id: 'keep', slug: 'keep', entityType: 'location', name: 'Старая крепость', description: 'Крепость на северном перевале.', facts: '', state: '', wiki: wiki({ aliases: ['Северный форт'], tags: ['Руины'], world: 'Срединный мир' }) },
    { id: 'wardens', slug: 'wardens', entityType: 'faction', name: 'Серые стражи', description: 'Хранители перевала.', facts: '', state: '', wiki: wiki({ customProperties: [{ id: 'goal', label: 'Цель', value: 'Защита северных земель' }] }) },
    { id: 'hero', slug: 'hero', entityType: 'playerCharacter', name: 'Элиас', description: 'Следопыт, связанный с северными землями.', facts: '', state: '', wiki: wiki() },
    { id: 'vargos', slug: 'vargos', entityType: 'npc', name: 'Варгос Дымный', description: 'Посредник и торговец редкими сведениями.', facts: '', state: '', wiki: wiki({ customProperties: [{ id: 'role', label: 'Роль', value: 'Информатор' }] }) },
  ],
  layout: { libraryWidth: 336, inspectorWidth: Number(process.env.WIKI_PANEL_WIDTH || 520), section: 'creature', query: '' },
  diagrams: [
    { id: 'north', name: 'Север', viewport: { x: 0, y: 0, zoom: 1 }, nodes: [
      { id: 'keep-node', type: 'location', position: { x: 120, y: 100 }, data: { entityId: 'keep' } },
      { id: 'hero-node', type: 'entity', position: { x: 480, y: 220 }, data: { entityId: 'hero' } },
      { id: 'vargos-node', type: 'entity', position: { x: 420, y: 20 }, data: { entityId: 'vargos' } },
    ], edges: [{ id: 'keep-vargos', source: 'keep-node', target: 'vargos-node' }] },
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
  assert.equal(await panel.getAttribute('data-wiki-mode'), 'view')
  await panel.getByRole('heading', { name: 'Старая крепость' }).waitFor()
  assert.equal(await panel.getByRole('textbox', { name: 'Название страницы' }).count(), 0, 'просмотр не должен выглядеть как форма')
  assert.equal(await panel.locator('[data-campaign-wiki-image="cover"]').count(), 0, 'пустая обложка не должна занимать место в просмотре')
  assert.equal(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, 'панель не должна иметь горизонтальный скролл')
  if (process.env.WIKI_SCREENSHOT) await page.screenshot({ path: process.env.WIKI_SCREENSHOT, fullPage: true })

  await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
  assert.equal(await panel.count(), 1, 'клик по пустой карте не должен закрывать wiki-карточку')

  await panel.getByRole('button', { name: /Варгос Дымный.*NPC/ }).click()
  await panel.getByRole('heading', { name: 'Варгос Дымный' }).waitFor()
  assert.equal(await panel.getAttribute('data-wiki-mode'), 'view', 'NPC должен открываться в режиме чтения')
  assert.equal(await panel.getByRole('textbox').count(), 0)
  await panel.getByRole('button', { name: 'Назад' }).click()
  await panel.getByRole('heading', { name: 'Старая крепость' }).waitFor()

  await panel.getByRole('button', { name: 'Редактировать страницу' }).click()
  assert.equal(await panel.getAttribute('data-wiki-mode'), 'edit')
  assert.equal(await panel.getByRole('textbox', { name: 'Название страницы' }).inputValue(), 'Старая крепость')
  assert.equal(await panel.locator('[data-campaign-wiki-image="cover"]').count(), 1, 'загрузка обложки должна оставаться в редакторе')
  if (process.env.WIKI_EDIT_SCREENSHOT) await page.screenshot({ path: process.env.WIKI_EDIT_SCREENSHOT, fullPage: true })
  await panel.getByRole('textbox', { name: 'Статус' }).fill('Заброшена')
  await panel.getByRole('button', { name: '+ Новый раздел' }).click()
  await panel.getByRole('textbox', { name: 'Название раздела' }).fill('Тайна мастера')
  await page.waitForFunction(key => {
    const value = JSON.parse(localStorage.getItem(key))
    const entity = value.entities.find(item => item.id === 'keep')
    return entity.wiki.status === 'Заброшена' && entity.wiki.sections[0]?.visibility === 'master'
  }, storageKey)
  await panel.getByRole('button', { name: '+ Ссылка' }).click()
  await page.getByRole('button', { name: 'Серые стражи' }).click()
  await panel.getByRole('button', { name: 'Завершить редактирование' }).click()
  assert.equal(await panel.getAttribute('data-wiki-mode'), 'view')
  assert.equal(await panel.getByRole('textbox', { name: 'Статус' }).count(), 0)
  await panel.getByText('Заброшена', { exact: true }).waitFor()
  await panel.getByRole('link', { name: 'Серые стражи' }).click()
  await page.getByRole('button', { name: /Выбрать схему: Юг/ }).waitFor()
  await panel.getByRole('heading', { name: 'Серые стражи' }).waitFor()
  assert.equal(await panel.getAttribute('data-wiki-mode'), 'view', 'фракция должна открываться в режиме чтения')
  assert.equal(await panel.getByRole('textbox').count(), 0)

  await panel.getByRole('button', { name: 'Назад' }).click()
  await page.getByRole('button', { name: /Выбрать схему: Север/ }).waitFor()
  await panel.getByRole('heading', { name: 'Старая крепость' }).waitFor()
  await page.keyboard.press('Escape')
  await panel.waitFor({ state: 'detached' })

  await page.locator('.react-flow__node[data-id="hero-node"]').getByRole('heading', { name: 'Элиас' }).click()
  await panel.getByRole('heading', { name: 'Элиас' }).waitFor()
  await panel.getByRole('heading', { name: 'Краткое досье' }).waitFor()
  assert.equal(await panel.getByText('Характеристики и проверки', { exact: true }).count(), 0)
  assert.equal(await panel.getByText('Снаряжение и деньги', { exact: true }).count(), 0)
  assert.equal(await panel.getByText('Заклинания', { exact: true }).count(), 0)
  if (process.env.WIKI_CHARACTER_SCREENSHOT) await page.screenshot({ path: process.env.WIKI_CHARACTER_SCREENSHOT, fullPage: true })
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
