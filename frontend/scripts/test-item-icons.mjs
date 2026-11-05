// Проверка иконок и девяти видов каталога без обращения к пользовательской БД.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const kinds = [
  ['wand', 'Волшебная палочка'], ['armor', 'Доспех (кольчуга)'], ['scroll', 'Свиток'],
  ['potion', 'Зелье'], ['ring', 'Кольцо'], ['wondrous', 'Чудесный предмет'],
  ['staff', 'Посох'], ['rod', 'Жезл'], ['weapon', 'Оружие (длинный меч)'],
  ['weapon', 'Оружие (короткий меч)'], ['wondrous', 'Волшебная безделушка (татуировка)'],
]
const entries = kinds.map(([kind, classification], index) => ({
  id: index + 1, entity_type: 'item', name: `Предмет ${index + 1}`, name_en: '', slug: `item-${index + 1}`,
  sources: ['DMG'], summary: { classification, rarity: 'Редкий', requires_attunement: false }, kind,
}))
const baseUrl = process.env.ENCYCLOPEDIA_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
page.setDefaultTimeout(10000)
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'item-icons-test-token'))
await page.route('**/api/**', (route) => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (url.pathname === '/api/encyclopedia/') {
    const slug = url.searchParams.get('slug')
    const type = url.searchParams.get('type')
    const results = entries.filter((entry) => (!slug || entry.slug === slug) && (!type || type === 'item'))
    return route.fulfill({ json: { count: results.length, results } })
  }
  const entry = entries.find((entry) => url.pathname === `/api/encyclopedia/${entry.id}/`)
  if (entry) return route.fulfill({ json: { ...entry, data: entry.summary, content_html: '<p>Описание предмета.</p>' } })
  return route.fulfill({ json: { count: 0, results: [], types: [], total: 0 } })
})

async function checkIcon(icon, kind) {
  await icon.waitFor({ state: 'visible' })
  const appearance = await icon.evaluate((element) => {
    const style = getComputedStyle(element)
    const bounds = element.getBoundingClientRect()
    return { mask: style.maskImage, color: style.backgroundColor, width: bounds.width, height: bounds.height }
  })
  assert.match(appearance.mask, new RegExp(`/assets/${kind}\\.svg`))
  assert.ok(appearance.width >= 16 && appearance.height >= 16)
  assert.notEqual(appearance.color, 'rgba(0, 0, 0, 0)')
  const asset = await page.request.get(appearance.mask.slice(5, -2))
  assert.equal(asset.status(), 200)
  assert.match(await asset.text(), /<svg/)
}

try {
  await page.goto(`${baseUrl}/encyclopedia/items`)
  await page.getByText(`Найдено: ${entries.length}`, { exact: true }).waitFor()
  for (const entry of entries) {
    const card = page.getByRole('button', { name: entry.name, exact: true })
    await checkIcon(card.locator(`[data-icon="item-${entry.kind}"]`), entry.kind)
    await card.click()
    await checkIcon(page.locator('[class*="previewPanel"] [class*="previewIcon"] [data-icon]'), entry.kind)
  }
  await page.getByRole('button', { name: 'Фильтр: Тип', exact: true }).click()
  const options = page.getByRole('checkbox')
  assert.equal(await options.count(), 9)
  const labels = await options.evaluateAll((inputs) => inputs.map((input) => input.closest('label')?.textContent ?? input.getAttribute('aria-label')))
  assert.ok(labels.every((label) => !/[()]/.test(label)), 'Подтипы не должны появляться в фильтре')
  await page.getByRole('checkbox', { name: /Оружие/ }).locator('xpath=ancestor::label').click()
  await page.getByText('Найдено: 2', { exact: true }).waitFor()
  await page.keyboard.press('Escape')

  await page.goto(`${baseUrl}/encyclopedia/item/item-9`)
  await page.getByRole('heading', { name: 'Предмет 9', level: 1 }).waitFor()
  await checkIcon(page.locator('main [data-icon="item-weapon"]'), 'weapon')
  assert.ok((await page.locator('main').innerText()).includes('Оружие (длинный меч)'), 'Полная классификация остаётся в карточке')

  await page.goto(`${baseUrl}/encyclopedia?search=Предмет`)
  const results = page.getByRole('region', { name: 'Результаты поиска' })
  await results.getByText(`Найдено материалов: ${entries.length}`).waitFor()
  for (const entry of entries) {
    await checkIcon(results.getByRole('link', { name: `${entry.name} Магические предметы`, exact: true })
      .locator(`[data-icon="item-${entry.kind}"]`), entry.kind)
  }
  await checkIcon(page.locator('#recent-visits [data-icon="item-weapon"]'), 'weapon')
  assert.deepEqual(errors, [])
  await page.screenshot({ path: join(tmpdir(), 'cauldron-item-icons.png'), fullPage: true })
  console.log('Предметы: 9 иконок, каталог, предпросмотр, полная карточка, общий поиск, история и фильтр подтипов — OK')
} finally {
  await browser.close()
}
