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
let popularUnavailable = false
let popularEmpty = false
const globalPopular = Array.from({ length: 20 }, (_, index) => ({
  id: 901 + index, name: index === 0 ? 'Дракон' : `Общий материал ${index + 1}`, name_en: '',
  entity_type: 'creature', slug: `global-${index}`, opens_count: 1000 - index,
}))
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (path === '/api/encyclopedia/popular/') return popularUnavailable
    ? route.fulfill({ status: 404, json: { detail: 'Not found' } })
    : route.fulfill({ json: { count: popularEmpty ? 0 : globalPopular.length, results: popularEmpty ? [] : globalPopular } })
  return route.fulfill({ json: { count: 0, results: [] } })
})
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
    ...Array.from({ length: 45 }, (_, index) => ({ path: `/encyclopedia/entry/${index + 1}`,
      title: `Недавний материал ${index + 1}`, category: 'Заклинание', visitCount: 50 })),
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
async function checkSidebarBounds() {
  await settleLayout()
  const bounds = await sidebar.evaluate(element => ({
    top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom,
    groupsTop: element.previousElementSibling.getBoundingClientRect().top,
    rulesBottom: element.previousElementSibling.lastElementChild.getBoundingClientRect().bottom,
    panels: [...element.children].map(panel => panel.getBoundingClientRect().bottom),
  }))
  assert.ok(Math.abs(bounds.top - bounds.groupsTop) < 1, 'Верх колонки совпадает с разделами')
  assert.ok(Math.abs(bounds.bottom - bounds.rulesBottom) < 1, 'Низ колонки совпадает с Правилами и механиками')
  assert.ok(bounds.panels.every(bottom => bottom <= bounds.rulesBottom + 1), 'Панели не выходят за низ разделов')
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
  assert.equal(await sidebar.getByRole('heading', { name: 'Быстрый доступ' }).count(), 0)
  assert.equal(await sidebar.locator('section').count(), 2)
  const recent = sidebar.locator('section[aria-labelledby="encyclopedia-history"]')
  const popular = sidebar.locator('section[aria-labelledby="encyclopedia-popular"]')
  assert.equal(await recent.getByRole('link').count(), 50)
  await popular.getByRole('link').first().waitFor()
  assert.match(await popular.getByRole('link').first().innerText(), /Дракон/)
  assert.equal(await recent.getByRole('button', { name: /Вся история|Свернуть/ }).count(), 0)
  await checkSidebarBounds()
  const overflow = await page.locator('#recent-visits').evaluate(element => {
    element.scrollTo({ top: element.scrollHeight, behavior: 'instant' })
    return { scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollTop: element.scrollTop }
  })
  assert.ok(overflow.scrollHeight > overflow.clientHeight && overflow.scrollTop > 0, 'История всегда внутри прокручиваемого окна')
  await page.locator('#recent-visits').evaluate(element => { element.scrollTo({ top: 0, behavior: 'instant' }) })

  const rules = page.locator('[aria-labelledby="encyclopedia-rules"]')
  const rulesCount = await rules.getByRole('link').count()
  assert.ok(rulesCount < 7)
  await rules.getByRole('button', { name: 'Показать все разделы: Правила и механики' }).click()
  assert.equal(await rules.getByRole('link').count(), 7)
  await checkSidebarBounds()
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

  await recent.getByRole('link', { name: /Состояния/ }).click()
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
    } else await checkSidebarBounds()
    if (width === 390) {
      await page.screenshot({ path: join(tmpdir(), 'encyclopedia-dashboard-mobile.png'), fullPage: true })
      const directories = page.locator('[aria-labelledby="encyclopedia-directories"]')
      await directories.getByRole('button', { name: 'Показать все разделы: Справочники' }).click()
      assert.equal(await directories.getByRole('link').count(), 5)
      await directories.getByRole('button', { name: 'Свернуть: Справочники' }).click()
    }
  }
  await recent.getByRole('button', { name: 'Очистить историю' }).click()
  assert.equal(await recent.getByRole('link').count(), 0)
  assert.equal(await popular.getByRole('link').count(), 20, 'Личная история не влияет на общий рейтинг')
  popularUnavailable = true
  await page.reload()
  await popular.getByText('Общий рейтинг пока недоступен.').waitFor()
  assert.equal(await popular.getByRole('link').count(), 0, 'Нет подмены общего рейтинга личными данными')
  popularUnavailable = false
  await popular.getByRole('button', { name: 'Повторить' }).click()
  await popular.getByRole('link', { name: /Дракон/ }).waitFor()
  popularEmpty = true
  await page.reload()
  await popular.getByText('Пока нет данных об открытиях.').waitFor()
  assert.deepEqual(errors, [])
  console.log('Энциклопедия: две ограниченные высотой панели, постоянный скролл истории, общий серверный рейтинг/ошибка/повтор, запросы, адаптив 320–2560 px — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-dashboard-failure.png'), fullPage: true })
  console.error('Страница:', page.url(), 'Ошибки:', errors)
  throw error
} finally {
  await browser.close()
}
