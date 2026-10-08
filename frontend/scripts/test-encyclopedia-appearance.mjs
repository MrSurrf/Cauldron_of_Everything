// Локальная проверка оформления: без серверной БД и изменений пользовательских данных.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const baseUrl = process.env.ENCYCLOPEDIA_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => localStorage.setItem('surveyAuth.access', 'appearance-test-token'))
await page.route('**/api/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === '/api/auth/session/'
  ? { authenticated: true } : { count: 0, results: [] } }))

async function checkSearchFrames() {
  const frames = await page.locator('main input:not([type="checkbox"])').evaluateAll(inputs => inputs.map(input => {
    const frame = input.parentElement
    const inner = frame.querySelector('[class*="innerFrame"]')
    return inner ? { display: getComputedStyle(inner).display, border: getComputedStyle(frame).backgroundColor } : null
  }).filter(Boolean))
  assert.ok(frames.length > 0)
  assert.ok(frames.every(frame => frame.display === 'none'))
  assert.ok(frames.every(frame => frame.border !== 'rgba(0, 0, 0, 0)'))
}

try {
  await page.goto(`${baseUrl}/encyclopedia`)
  const search = page.getByRole('searchbox', { name: 'Поиск по энциклопедии', exact: true })
  await search.waitFor()
  const hero = await page.locator('main').evaluate(async main => {
    const style = getComputedStyle(main, '::before')
    const url = style.backgroundImage.match(/url\("?([^"\)]+)"?\)/)?.[1]
    const image = new Image()
    image.src = url
    await image.decode()
    return { background: style.backgroundImage, imageWidth: image.naturalWidth, events: style.pointerEvents }
  })
  assert.match(hero.background, /encyclopedia[^/]*\.png/)
  assert.ok(hero.background.includes('linear-gradient'))
  assert.ok(hero.imageWidth > 1000)
  assert.equal(hero.events, 'none')
  await checkSearchFrames()
  const positions = () => page.locator('main h1, main [role="search"], main [aria-labelledby="encyclopedia-directories"]').evaluateAll(nodes => nodes.map(node => {
    const { x, y, width, height } = node.getBoundingClientRect()
    return { x, y, width, height }
  }))
  const before = await positions()
  const hideBackground = await page.addStyleTag({ content: 'main::before { display: none !important; }' })
  assert.deepEqual(await positions(), before, 'Фоновый слой не должен менять композицию')
  await hideBackground.evaluate(style => style.remove())
  await page.keyboard.press('Control+k')
  assert.equal(await search.evaluate(input => document.activeElement === input), true)
  await search.fill('заклинания')
  await page.getByRole('region', { name: 'Результаты поиска' }).waitFor()
  await search.fill('')
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-background-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 900 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await checkSearchFrames()
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-background-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1700, height: 1000 })
  for (const section of ['bestiary', 'spells', 'backgrounds']) {
    await page.goto(`${baseUrl}/encyclopedia/${section}`)
    await page.locator('main input[type="search"]').waitFor()
    await checkSearchFrames()
    assert.equal(await page.locator('main').evaluate(main => getComputedStyle(main, '::before').content), 'none')
  }
  assert.deepEqual(errors, [])
  console.log('Энциклопедия: фон, градиенты, неизменная композиция, поиск, компактные рамки разделов и мобильная ширина — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-appearance-failure.png'), fullPage: true })
  console.error('Страница:', page.url(), 'Ошибки:', errors, (await page.locator('body').innerText()).slice(0, 700))
  throw error
} finally {
  await browser.close()
}
