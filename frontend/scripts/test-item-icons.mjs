// Проверка иконок, цветов редкости и девяти видов каталога без пользовательской БД.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const kinds = [
  ['wand', 'Волшебная палочка', 'Обычный', 'common'],
  ['armor', 'Доспех (кольчуга)', 'Необычный', 'uncommon'],
  ['scroll', 'Свиток', 'Редкий', 'rare'],
  ['potion', 'Зелье', 'Очень редкий', 'very-rare'],
  ['ring', 'Кольцо', 'Легендарный', 'legendary'],
  ['wondrous', 'Чудесный предмет', 'Артефакт', 'artifact'],
  ['staff', 'Посох', 'Неизвестная редкость', 'unknown'],
  ['rod', 'Жезл', 'Редкий', 'rare'],
  ['weapon', 'Оружие (длинный меч)', 'Редкий', 'rare'],
  ['weapon', 'Оружие (короткий меч)', 'Легендарный', 'legendary'],
  ['wondrous', 'Волшебная безделушка (татуировка)', 'Обычный', 'common'],
]
const entries = kinds.map(([kind, classification, rarity, rarityKey], index) => ({
  id: index + 1, entity_type: 'item', name: `Предмет ${index + 1}`, name_en: '', slug: `item-${index + 1}`,
  sources: ['DMG'], summary: { classification, rarity, requires_attunement: false }, kind, rarityKey,
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

const rarityColors = new Map()
const itemColors = new Map()

async function checkIcon(icon, entry, surface) {
  await icon.waitFor({ state: 'visible' })
  const appearance = await icon.evaluate((element, rarity) => {
    const style = getComputedStyle(element)
    const bounds = element.getBoundingClientRect()
    const token = `--color-item-rarity-${rarity}`
    const probe = document.createElement('span')
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;background-color:var(${token})`
    element.parentElement.append(probe)
    const expectedColor = getComputedStyle(probe).backgroundColor
    probe.remove()
    return {
      mask: style.maskImage, color: style.backgroundColor, expectedColor,
      rarity: element.getAttribute('data-item-rarity'), tokenValue: style.getPropertyValue(token).trim(),
      width: bounds.width, height: bounds.height,
    }
  }, entry.rarityKey)
  const label = `${surface}: ${entry.name} (${entry.summary.rarity})`
  assert.match(appearance.mask, new RegExp(`/assets/${entry.kind}\\.svg`), label)
  assert.ok(appearance.width >= 16 && appearance.height >= 16)
  assert.equal(appearance.rarity, entry.rarityKey, `${label}: ключ редкости`)
  assert.ok(appearance.tokenValue, `${label}: токен редкости задан`)
  assert.notEqual(appearance.color, 'rgba(0, 0, 0, 0)', label)
  assert.equal(appearance.color, appearance.expectedColor, `${label}: цвет совпадает с токеном редкости`)
  if (rarityColors.has(entry.rarityKey)) {
    assert.equal(appearance.color, rarityColors.get(entry.rarityKey), `${label}: одна редкость имеет один цвет для разных типов`)
  }
  if (itemColors.has(entry.id)) {
    assert.equal(appearance.color, itemColors.get(entry.id), `${label}: цвет совпадает в разных представлениях`)
  }
  rarityColors.set(entry.rarityKey, appearance.color)
  itemColors.set(entry.id, appearance.color)
  const asset = await page.request.get(appearance.mask.slice(5, -2))
  assert.equal(asset.status(), 200)
  assert.match(await asset.text(), /<svg/)
}

try {
  await page.goto(`${baseUrl}/encyclopedia/items`)
  await page.getByText(`Найдено: ${entries.length}`, { exact: true }).waitFor()
  for (const entry of entries) {
    const card = page.getByRole('button', { name: entry.name, exact: true })
    await checkIcon(card.locator(`[data-icon="item-${entry.kind}"]`), entry, 'Каталог')
    await card.click()
    await checkIcon(page.locator('[class*="previewPanel"] [class*="previewIcon"] [data-icon]'), entry, 'Предпросмотр')
  }
  assert.equal(rarityColors.size, 7, 'Проверены шесть стандартных редкостей и неизвестная')
  assert.equal(new Set(rarityColors.values()).size, 7, 'Все семь редкостей имеют разные цвета')
  assert.notEqual(itemColors.get(9), itemColors.get(10), 'Один вид оружия имеет разные цвета при разной редкости')
  await page.getByRole('button', { name: 'Фильтр: Тип', exact: true }).click()
  const options = page.getByRole('checkbox')
  assert.equal(await options.count(), 9)
  const labels = await options.evaluateAll((inputs) => inputs.map((input) => input.closest('label')?.textContent ?? input.getAttribute('aria-label')))
  assert.ok(labels.every((label) => !/[()]/.test(label)), 'Подтипы не должны появляться в фильтре')
  await page.getByRole('checkbox', { name: /Оружие/ }).locator('xpath=ancestor::label').click()
  await page.getByText('Найдено: 2', { exact: true }).waitFor()
  await page.keyboard.press('Escape')

  for (const entry of entries) {
    await page.goto(`${baseUrl}/encyclopedia/item/${entry.slug}`)
    await page.getByRole('heading', { name: entry.name, level: 1 }).waitFor()
    await checkIcon(page.locator(`main [data-icon="item-${entry.kind}"]`), entry, 'Полная карточка')
    assert.ok((await page.locator('main').innerText()).includes(entry.summary.classification), 'Полная классификация остаётся в карточке')
  }

  await page.goto(`${baseUrl}/encyclopedia?search=Предмет`)
  const results = page.getByRole('region', { name: 'Результаты поиска' })
  await results.getByText(`Найдено материалов: ${entries.length}`).waitFor()
  for (const entry of entries) {
    await checkIcon(results.getByRole('link', { name: `${entry.name} Магические предметы`, exact: true })
      .locator(`[data-icon="item-${entry.kind}"]`), entry, 'Общий поиск')
    await checkIcon(page.locator('#recent-visits').getByRole('link', {
      name: `${entry.name} Магические предметы`, exact: true,
    }).locator(`[data-icon="item-${entry.kind}"]`), entry, 'История')
  }
  assert.deepEqual(errors, [])
  await page.screenshot({ path: join(tmpdir(), 'cauldron-item-icons.png'), fullPage: true })
  console.log('Предметы: 9 иконок, 7 цветов редкости в каталоге, предпросмотре, полных карточках, общем поиске и истории; фильтр подтипов — OK')
} finally {
  await browser.close()
}
