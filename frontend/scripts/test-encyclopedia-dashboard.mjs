// Изолированный браузер и локальные тестовые данные; серверная БД не изменяется.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const baseUrl = process.env.ENCYCLOPEDIA_TEST_URL || 'http://127.0.0.1:5175'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.route('**/api/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/auth/session/'
  ? { authenticated: true } : { count: 0, results: [] } }))
await page.addInitScript(() => {
  localStorage.setItem('surveyAuth.access', 'dashboard-test-token')
  if (localStorage.getItem('dashboard-test-seeded')) return
  localStorage.setItem('dashboard-test-seeded', 'true')
  const now = Date.now()
  localStorage.setItem('cauldron.encyclopedia.recent.v1:guest', JSON.stringify([
    { path: '/encyclopedia/bestiary', title: 'Бестиарий', category: 'Справочники', visitCount: 3 },
    { path: '/encyclopedia/classes', title: 'Классы', category: 'Справочники', visitCount: 1 },
    { path: '/encyclopedia/spells', title: 'Заклинания', category: 'Магия и предметы', visitCount: 8 },
    { path: '/encyclopedia/items', title: 'Магические предметы', category: 'Магия и предметы', visitCount: 2 },
    { path: '/encyclopedia/conditions', title: 'Состояния', category: 'Правила и механики', visitCount: 1 },
  ].map((entry, index) => ({ ...entry, visitedAt: now - 10_000 - index * 1000 }))))
  localStorage.setItem('cauldron.encyclopedia.queries.v1:guest', JSON.stringify(['Тараск', 'заклинания', 'состояния'].map((query, index) => ({ query, searchedAt: now - index * 1000 }))))
})

const search = page.getByRole('searchbox', { name: 'Поиск по энциклопедии', exact: true })
const recentQueries = page.getByRole('group', { name: 'Недавние запросы', exact: true })
const sidebar = page.getByRole('complementary', { name: 'Подборки энциклопедии' })

async function settleLayout() {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function checkCollapsedRows() {
  for (const group of ['directories', 'magic', 'rules']) {
    const grid = page.locator(`#section-grid-${group}`)
    const cards = await grid.locator('a').evaluateAll(links => links.map(link => ({
      top: link.getBoundingClientRect().top,
      hasPanel: !!link.querySelector('[data-cursor-reveal]'),
    })))
    assert.ok(cards.length > 0 && cards.every(card => Math.abs(card.top - cards[0].top) < 1))
    assert.ok(cards.every(card => !card.hasPanel), 'Кнопки разделов не должны быть статичными Panel')
  }
}

try {
  await page.goto(`${baseUrl}/encyclopedia`)
  await search.waitFor()
  await page.evaluate(() => document.fonts.ready)
  await settleLayout()
  await checkCollapsedRows()
  const layout = await sidebar.evaluate(element => ({ sidebar: element.getBoundingClientRect().left,
    groupsRight: element.previousElementSibling.getBoundingClientRect().right }))
  assert.ok(layout.sidebar > layout.groupsRight)
  assert.equal(await sidebar.getByRole('navigation', { name: 'Быстрый доступ' }).getByRole('link').count(), 5)
  const recent = sidebar.locator('section[aria-labelledby="encyclopedia-history"]')
  const popular = sidebar.locator('section[aria-labelledby="encyclopedia-popular"]')
  assert.equal(await recent.getByRole('link').count(), 3)
  assert.match(await popular.getByRole('link').first().innerText(), /Заклинания/)
  await recent.getByRole('button', { name: 'Вся история' }).click()
  assert.equal(await recent.getByRole('link').count(), 5)
  await recent.getByRole('button', { name: 'Свернуть' }).click()

  const rules = page.locator('[aria-labelledby="encyclopedia-rules"]')
  const rulesCount = await rules.getByRole('link').count()
  assert.ok(rulesCount < 7)
  await rules.getByRole('button', { name: 'Показать все разделы: Правила и механики' }).click()
  assert.equal(await rules.getByRole('link').count(), 7)
  await rules.getByRole('button', { name: 'Свернуть: Правила и механики' }).click()
  assert.equal(await rules.getByRole('link').count(), rulesCount)
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-dashboard-desktop.png'), fullPage: true })

  await search.fill('Огненный шар')
  await page.getByRole('region', { name: 'Результаты поиска' }).waitFor()
  await search.press('Enter')
  await recentQueries.getByRole('button', { name: 'Огненный шар', exact: true }).waitFor()
  await page.reload()
  await recentQueries.getByRole('button', { name: 'Огненный шар', exact: true }).waitFor()
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/session/'),
    recentQueries.getByRole('button', { name: 'Тараск', exact: true }).click(),
  ])
  await page.waitForURL(url => url.searchParams.get('search') === 'Тараск')
  await page.getByRole('region', { name: 'Результаты поиска' }).waitFor()
  assert.equal(await search.inputValue(), 'Тараск')
  await recentQueries.getByRole('button', { name: 'Очистить недавние запросы' }).click()
  await page.waitForTimeout(1200)
  assert.equal(await recentQueries.getByRole('button').count(), 0, 'Очистка не должна отменяться отложенным сохранением')
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/session/'),
    search.fill(''),
  ])
  await search.waitFor()

  const quickLink = sidebar.getByRole('navigation', { name: 'Быстрый доступ' }).getByRole('link', { name: /Состояния/ })
  await quickLink.click()
  await page.waitForURL(`${baseUrl}/encyclopedia/conditions`)
  await page.goto(`${baseUrl}/encyclopedia`)
  await search.waitFor()
  await settleLayout()
  for (const width of [1920, 2560, 1024, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await settleLayout()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await checkCollapsedRows()
    if (width <= 1024) {
      const stacked = await sidebar.evaluate(element => element.getBoundingClientRect().top >= element.previousElementSibling.getBoundingClientRect().bottom)
      assert.equal(stacked, true)
    }
    if (width === 390) {
      await page.screenshot({ path: join(tmpdir(), 'encyclopedia-dashboard-mobile.png'), fullPage: true })
      const directories = page.locator('[aria-labelledby="encyclopedia-directories"]')
      await directories.getByRole('button', { name: 'Показать все разделы: Справочники' }).click()
      assert.equal(await directories.getByRole('link').count(), 5)
      await directories.getByRole('button', { name: 'Свернуть: Справочники' }).click()
    }
  }
  await recent.getByRole('button', { name: 'Вся история' }).click()
  await recent.getByRole('button', { name: 'Очистить историю' }).click()
  assert.equal(await recent.getByRole('link').count(), 0)
  assert.equal(await popular.getByRole('link').count(), 0)
  assert.deepEqual(errors, [])
  console.log('Композиция энциклопедии: кнопки, раскрытие, правые подборки, рейтинг из реальных открытий, сохранение/повтор/очистка запросов, адаптив 320–2560 px — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-dashboard-failure.png'), fullPage: true })
  console.error('Страница:', page.url(), 'Ошибки:', errors)
  throw error
} finally {
  await browser.close()
}
