// Проверка реального UI в изолированном браузере с HTTP-фикстурами.
// Запуск: npm run dev -- --host 127.0.0.1, затем node scripts/test-campaign-table.mjs
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const baseUrl = process.env.TABLE_TEST_URL || 'http://127.0.0.1:5173'
const storageKey = 'cauldron.campaign-table.v1'
const creatures = [
  { id: 41, entity_type: 'creature', name: 'Призрак', name_en: 'Ghost', slug: 'ghost', summary: { challenge_rating: '4', size: 'Средний', creature_type: 'Нежить' } },
  { id: 42, entity_type: 'creature', name: 'Скелет', name_en: 'Skeleton', slug: 'skeleton', summary: { challenge_rating: '1/4', size: 'Средний', creature_type: 'Нежить' } },
]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'campaign-test-token'))
await page.route('**/api/**', async route => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/session/') return route.fulfill({ json: { authenticated: true } })
  if (url.pathname === '/api/encyclopedia/') {
    const q = (url.searchParams.get('q') || '').toLowerCase()
    const results = creatures.filter(creature => creature.name.toLowerCase().includes(q))
    return route.fulfill({ json: { count: results.length, results } })
  }
  const creature = creatures.find(item => url.pathname === `/api/encyclopedia/${item.id}/`)
  if (creature) return route.fulfill({ json: { ...creature, content_html: '', data: { ...creature.summary, armor_class: 13, hit_points: '45 (10к8)', speed: '30 фт.' } } })
  return route.fulfill({ status: 404, json: {} })
})

async function saved() {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
}
async function waitForNodes(count) {
  await page.waitForFunction(expected => document.querySelectorAll('.react-flow__node').length === expected, count)
}
async function moveBetween(from, to) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 15 })
  await page.mouse.up()
}

try {
  await page.goto(`${baseUrl}/my-table`)
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).waitFor()
  // HTML DnD: переносим из реального списка, позиция рассчитывается React Flow.
  const canvas = page.locator('.react-flow')
  const rect = await canvas.boundingBox()
  await page.getByRole('button', { name: 'Открыть: Призрак', exact: true }).dragTo(canvas, { targetPosition: { x: 110, y: 130 } })
  await waitForNodes(1)
  let state = await saved()
  assert.equal(state.diagrams[0].nodes[0].data.creature.id, '41')
  assert.ok(Math.abs(state.diagrams[0].nodes[0].position.x - 110) < 5)

  // Поиск проходит через общий репозиторий Entity.
  await page.getByRole('searchbox', { name: 'Поиск существ' }).fill('Скелет')
  await page.getByRole('button', { name: 'Добавить на холст: Скелет', exact: true }).click()
  await waitForNodes(2)
  const second = page.locator('.react-flow__node').nth(1)
  const secondRect = await second.boundingBox()
  await moveBetween({ x: secondRect.x + 90, y: secondRect.y + 25 }, { x: rect.x + rect.width - 160, y: rect.y + 350 })
  const first = page.locator('.react-flow__node').first()
  const sourceRect = await first.locator('.source').boundingBox()
  const targetRect = await second.locator('.target').boundingBox()
  await moveBetween({ x: sourceRect.x + sourceRect.width / 2, y: sourceRect.y + sourceRect.height / 2 }, { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 })
  await page.locator('.react-flow__edge').waitFor()
  await first.click()
  await page.getByRole('article', { name: 'Призрак', exact: true }).getByText('45', { exact: true }).waitFor()
  state = await saved()
  assert.equal(state.diagrams[0].edges.length, 1)
  assert.equal(state.diagrams[0].nodes[1].data.creature.id, '42')
  assert.ok(state.diagrams[0].nodes[1].position.y > 250)
  const before = state.diagrams[0]
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-desktop.png') })
  await page.reload()
  await waitForNodes(2)
  assert.deepEqual((await saved()).diagrams[0], before)
  await page.locator('.react-flow__edge').waitFor()
  await page.locator('.react-flow__node').first().click()
  await page.getByRole('article', { name: 'Призрак', exact: true }).getByText('45', { exact: true }).waitFor()

  // Изолированные схемы и восстановление активной схемы после перезагрузки.
  await page.getByRole('textbox', { name: 'Название новой схемы' }).fill('Подземелье')
  await page.getByRole('button', { name: '+ Создать схему', exact: true }).click()
  await waitForNodes(0)
  await page.reload()
  await page.getByRole('heading', { name: 'Подземелье', exact: true }).waitFor()
  await page.getByRole('navigation', { name: 'Выбор схемы' }).getByRole('button', { name: /Основная схема/ }).click()
  await waitForNodes(2)
  await page.locator('.react-flow__node').nth(1).click()
  await page.keyboard.press('Delete')
  await waitForNodes(1)
  assert.equal((await saved()).diagrams[0].edges.length, 0)

  // Ошибка записи видна пользователю; прежнее сохранение не пропадает.
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Quota exceeded') } })
  await page.getByRole('button', { name: 'Добавить на холст: Призрак', exact: true }).click()
  await page.getByRole('alert').getByText(/Изменения не сохранены/).waitFor()
  assert.equal((await saved()).diagrams[0].nodes.length, 1)
  await page.reload()
  await waitForNodes(1)

  // Мобильная раскладка и добавление без drag-and-drop.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Добавить на холст: Призрак', exact: true }).click()
  await waitForNodes(2)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-mobile.png'), fullPage: true })

  // Повреждённое сохранение не стирается при инициализации или изменениях.
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey)
  await page.reload()
  await page.getByRole('alert').getByText(/Не удалось восстановить/).waitFor()
  await page.getByRole('button', { name: 'Добавить на холст: Призрак', exact: true }).click()
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), '{broken')
  assert.deepEqual(errors, [])
  console.log('Мой стол: DnD, поиск Entity, перемещение, связь, карточка, reload, схемы, удаление, ошибки сохранения и мобильная раскладка — OK.')
  console.log(`Скриншоты: ${join(tmpdir(), 'campaign-table-desktop.png')} и ${join(tmpdir(), 'campaign-table-mobile.png')}`)
} catch (error) {
  console.error('Ошибки страницы:', errors)
  console.error((await page.locator('body').innerText()).slice(0, 3500))
  await page.screenshot({ path: join(tmpdir(), 'campaign-table-failure.png'), fullPage: true })
  throw error
} finally {
  await browser.close()
}
