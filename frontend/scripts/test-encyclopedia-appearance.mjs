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
  const frames = await page.locator('main input:not([type="checkbox"]), header input[type="search"]').evaluateAll(inputs => inputs.map(input => {
    const frame = input.parentElement
    const inner = frame.querySelector('[class*="innerFrame"]')
    return inner ? { display: getComputedStyle(inner).display, border: getComputedStyle(frame).backgroundColor } : null
  }).filter(Boolean))
  assert.ok(frames.length > 0)
  assert.ok(frames.every(frame => frame.display === 'none'))
  assert.ok(frames.every(frame => frame.border !== 'rgba(0, 0, 0, 0)'))
}

async function checkHeroBoundary() {
  const bounds = await page.locator('main').evaluate(main => {
    const image = main.querySelector('img[src*="encyclopedia"]')
    const imageRect = image.getBoundingClientRect()
    const searchRect = main.querySelector('[role="search"]').getBoundingClientRect()
    const titleRect = main.querySelector('h1').getBoundingClientRect()
    const descriptionRect = main.querySelector('header p').getBoundingClientRect()
    return { imageTop: imageRect.top, imageBottom: imageRect.bottom, searchTop: searchRect.top,
      titleTop: titleRect.top, descriptionBottom: descriptionRect.bottom,
      displayedRatio: imageRect.width / imageRect.height, originalRatio: image.naturalWidth / image.naturalHeight }
  })
  assert.ok(Math.abs(bounds.searchTop - bounds.imageBottom) < 1, 'Поиск должен начинаться точно на нижней границе изображения')
  assert.ok(Math.abs(bounds.displayedRatio - bounds.originalRatio) < 0.001, 'Изображение сохраняет новые пропорции без обрезки')
  assert.ok(bounds.titleTop >= bounds.imageTop && bounds.descriptionBottom <= bounds.imageBottom, 'Заголовок и описание должны оставаться внутри изображения')
}

try {
  await page.goto(`${baseUrl}/encyclopedia`)
  const search = page.getByRole('searchbox', { name: 'Поиск по энциклопедии', exact: true })
  await search.waitFor()
  const hero = await page.locator('main img[src*="encyclopedia"]').evaluate(async image => {
    await image.decode()
    await document.fonts.ready
    const style = getComputedStyle(image.parentElement, '::after')
    return { source: image.src, background: style.backgroundImage, imageWidth: image.naturalWidth, events: style.pointerEvents }
  })
  assert.match(hero.source, /encyclopedia[^/]*\.png/)
  assert.ok(hero.background.includes('linear-gradient'))
  assert.ok(hero.imageWidth > 1000)
  assert.equal(hero.events, 'none')
  await checkSearchFrames()
  await checkHeroBoundary()
  const siteSearch = page.getByRole('searchbox', { name: 'Поиск по сайту', exact: true })
  const frames = await Promise.all([search, siteSearch].map(input => input.evaluate(input => ({
    classes: [...input.parentElement.classList],
    override: getComputedStyle(input.parentElement).getPropertyValue('--input-inner-frame-display').trim(),
  }))))
  assert.ok(frames[0].classes.filter(name => frames[1].classes.includes(name)).length >= 2, 'Оба поиска используют общие классы FieldFrame и поискового варианта TextInput')
  assert.ok(frames.every(frame => frame.override === ''), 'Поиск не должен зависеть от локального CSS-переопределения')
  const positions = () => page.locator('main h1, main [role="search"], main [aria-labelledby="encyclopedia-directories"]').evaluateAll(nodes => nodes.map(node => {
    const { x, y, width, height } = node.getBoundingClientRect()
    return { x, y, width, height }
  }))
  const before = await positions()
  const hideBackground = await page.addStyleTag({ content: 'main [class*="hero"]::after { display: none !important; }' })
  assert.deepEqual(await positions(), before, 'Фоновый слой не должен менять композицию')
  await hideBackground.evaluate(style => style.remove())
  await page.keyboard.press('Control+k')
  assert.equal(await search.evaluate(input => document.activeElement === input), true)
  await search.fill('заклинания')
  await page.getByRole('region', { name: 'Результаты поиска' }).waitFor()
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/session/'),
    search.fill(''),
  ])
  await page.waitForURL(url => !url.searchParams.has('search'))
  await siteSearch.waitFor()
  await siteSearch.fill('дракон')
  assert.equal(await siteSearch.inputValue(), 'дракон')
  await siteSearch.press('Enter')
  await page.waitForURL(url => url.searchParams.get('search') === 'дракон')
  await page.getByRole('region', { name: 'Результаты поиска' }).waitFor()
  assert.equal(await search.inputValue(), 'дракон')
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/session/'),
    search.fill(''),
  ])
  await page.waitForURL(url => !url.searchParams.has('search'))
  await search.waitFor()
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-background-desktop.png'), fullPage: true })
  for (const width of [1280, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await checkSearchFrames()
    await checkHeroBoundary()
    if (width === 390) await page.screenshot({ path: join(tmpdir(), 'encyclopedia-background-mobile.png'), fullPage: true })
  }
  await page.setViewportSize({ width: 1700, height: 1000 })
  for (const section of ['bestiary', 'spells', 'backgrounds']) {
    await page.goto(`${baseUrl}/encyclopedia/${section}`)
    await page.locator('main input[type="search"]').waitFor()
    await checkSearchFrames()
    assert.equal(await page.locator('main img[src*="encyclopedia"]').count(), 0)
  }
  assert.deepEqual(errors, [])
  console.log('Энциклопедия: новые пропорции изображения, точная граница поиска, заголовок, общий TextInput в шапке и на странице, поиск и ширины 320–1700 px — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-appearance-failure.png'), fullPage: true })
  console.error('Страница:', page.url(), 'Ошибки:', errors, (await page.locator('body').innerText()).slice(0, 700))
  throw error
} finally {
  await browser.close()
}
