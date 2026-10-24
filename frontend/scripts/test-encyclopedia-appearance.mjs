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
    if (input.type === 'search') {
      const icon = frame.querySelector('[data-icon="search"]')
      if (!icon || getComputedStyle(icon).backgroundColor !== getComputedStyle(icon.parentElement).color) return { display: 'missing-search-icon' }
    }
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
    const heroRect = image.parentElement.getBoundingClientRect()
    const searchRect = main.querySelector('[role="search"]').getBoundingClientRect()
    const titleRect = main.querySelector('h1').getBoundingClientRect()
    const descriptionRect = main.querySelector('header p').getBoundingClientRect()
    return { imageTop: imageRect.top, imageBottom: imageRect.bottom, searchTop: searchRect.top,
      titleTop: titleRect.top, descriptionBottom: descriptionRect.bottom,
      heroHeight: heroRect.height, objectFit: getComputedStyle(image).objectFit }
  })
  assert.ok(Math.abs(bounds.searchTop - bounds.imageBottom) < 1, 'Поиск должен начинаться точно на нижней границе изображения')
  assert.ok(bounds.heroHeight >= 288 && bounds.heroHeight <= 365, 'Высота баннера увеличена на 20%, но остаётся ограниченной')
  assert.equal(bounds.objectFit, 'cover', 'Кадрирование не должно растягивать изображение')
  assert.ok(bounds.titleTop >= bounds.imageTop && bounds.descriptionBottom <= bounds.imageBottom, 'Заголовок и описание должны оставаться внутри изображения')
}

async function readComposition() {
  return page.locator('main').evaluate(main => {
    const image = main.querySelector('img[src*="encyclopedia"]')
    const hero = image.parentElement
    const heroRect = hero.getBoundingClientRect()
    const imageRect = image.getBoundingClientRect()
    const titleRect = main.querySelector('h1').getBoundingClientRect()
    const searchRect = main.querySelector('[role="search"]').getBoundingClientRect()
    const overlay = getComputedStyle(hero, '::after')
    return {
      heroLeft: heroRect.left, heroWidth: heroRect.width, heroHeight: heroRect.height,
      imageOffset: imageRect.left - heroRect.left, imageWidth: imageRect.width,
      titleOffset: titleRect.left - heroRect.left, searchOffset: searchRect.left - heroRect.left,
      gradient: overlay.backgroundImage, gradientWidth: overlay.width,
    }
  })
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
  const divider = await page.locator('main header [class*="titleDivider"]').evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return { top: bounds.top, bottom: bounds.bottom, width: bounds.width,
      titleBottom: element.previousElementSibling.getBoundingClientRect().bottom,
      descriptionTop: element.nextElementSibling.getBoundingClientRect().top,
      background: style.backgroundImage, shadow: style.boxShadow,
      diamond: getComputedStyle(element, '::after').transform }
  })
  assert.ok(divider.width > 0 && divider.top > divider.titleBottom && divider.bottom < divider.descriptionTop)
  assert.ok(divider.background.includes('linear-gradient') && divider.shadow !== 'none' && divider.diamond !== 'none')
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
  let desktopComposition
  for (const width of [1920, 2560, 3440, 3840, 1280, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await checkSearchFrames()
    await checkHeroBoundary()
    const composition = await readComposition()
    assert.ok(Math.abs(composition.titleOffset - composition.searchOffset) < 1, 'Заголовок и поиск должны использовать одну ось')
    if (width >= 1920) {
      const { heroLeft, ...relativeComposition } = composition
      assert.ok(Math.abs(heroLeft - (width - composition.heroWidth) / 2) < 1, 'Композиция центрируется на широком мониторе')
      if (desktopComposition) assert.deepEqual(relativeComposition, desktopComposition, 'Соотношение картинки, заголовка и градиента не меняется на больших экранах')
      else desktopComposition = relativeComposition
      await page.screenshot({ path: join(tmpdir(), `encyclopedia-background-${width}.png`), fullPage: true })
    }
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
  console.log('Энциклопедия: стабильная композиция на мониторах 1920–3840 px, граница поиска, общий TextInput и адаптив 320–3840 px — OK.')
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'encyclopedia-appearance-failure.png'), fullPage: true })
  console.error('Страница:', page.url(), 'Ошибки:', errors, (await page.locator('body').innerText()).slice(0, 700))
  throw error
} finally {
  await browser.close()
}
