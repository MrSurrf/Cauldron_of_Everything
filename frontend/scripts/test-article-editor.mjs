// Изолированный браузер: реальные локальные черновики, тестовые ответы сервера.
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { chooseCombobox } from './choose-combobox.mjs'

const origin = process.env.ARTICLE_EDITOR_TEST_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true })
const token = `e2e.${Buffer.from(JSON.stringify({ user_id: `article-smoke-${crypto.randomUUID()}` })).toString('base64url')}.e2e`
const errors = []
const writes = []
const checks = []
try {
  const page = await browser.newPage({ viewport: { width: 1774, height: 1050 } })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('net::ERR_ABORTED')) errors.push(message.text()) })
  await page.addInitScript(value => localStorage.setItem('surveyAuth.access', value), token)
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.url())
    const path = new URL(request.url()).pathname
    const entity = { id: 123, entity_type: 'spell', slug: 'shield', name: 'Щит', name_en: 'Shield', sources: ['PHB'], summary: { level: 1, school: 'Ограждение' } }
    const data = path.includes('/auth/session') ? { authenticated: true }
      : path.includes('/encyclopedia') ? { count: 1, results: [entity] } : { data: {} }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  const source = page.getByRole('textbox', { name: 'Текст статьи в Markdown', exact: true })
  const title = page.getByRole('textbox', { name: 'Заголовок статьи', exact: true })
  const saved = () => page.getByRole('status').filter({ hasText: 'Сохранено в этом браузере' }).waitFor()
  await page.goto(`${origin}/articles`)
  await page.getByRole('button', { name: 'Создать статью', exact: true }).click()
  await source.waitFor()
  assert.equal(new URL(page.url()).pathname, '/articles/create')
  assert.equal(await page.locator('[data-article-draft]').count(), 1)
  checks.push('Создать статью → пустой Markdown-редактор')

  await title.fill('Путеводитель по Забытым Королевствам')
  await page.getByRole('textbox', { name: 'Краткое описание', exact: true }).fill('Идеи и материалы для следующего приключения.')
  await source.fill('# Приключение начинается\n\nСоберите команду и отправляйтесь в путь.\n\n- Карта\n- Припасы')
  await page.getByRole('button', { name: '＋ Новый черновик', exact: true }).click()
  await title.fill('Вторая статья')
  await source.fill('Этот текст остаётся во втором черновике.')
  await page.locator('[data-article-draft]').filter({ hasText: 'Путеводитель' }).click()
  assert.match(await source.inputValue(), /Приключение начинается/)
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await saved()
  await page.reload()
  await source.waitFor()
  assert.equal(await title.inputValue(), 'Путеводитель по Забытым Королевствам')
  assert.equal(await page.locator('[data-article-draft]').count(), 2)
  checks.push('Новый черновик, немедленное переключение и восстановление после reload')

  const imageData = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 320
    const context = canvas.getContext('2d')
    context.fillStyle = 'rgb(47, 79, 98)'; context.fillRect(0, 0, 480, 320)
    context.fillStyle = 'rgb(178, 145, 94)'; context.fillRect(80, 90, 290, 140)
    context.fillStyle = 'rgb(213, 226, 218)'; context.beginPath(); context.arc(350, 65, 25, 0, Math.PI * 2); context.fill()
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('[data-article-image-file]').setInputFiles({ name: 'карта.png', mimeType: 'image/png', buffer: Buffer.from(imageData, 'base64') })
  await page.locator('[data-article-image-selected] img').waitFor()
  await page.getByRole('textbox', { name: 'Alt-текст', exact: true }).fill('Карта региона у моря')
  await page.getByRole('textbox', { name: 'Подпись (необязательно)', exact: true }).fill('Место начала приключения')
  await chooseCombobox(page, 'Пропорции кадра', '16:9 — широкий кадр')
  const cropFrame = page.locator('[data-article-crop-frame]')
  await cropFrame.waitFor()
  await page.locator('[data-article-crop-stage]').scrollIntoViewIfNeeded()
  const beforeCrop = await cropFrame.boundingBox()
  const corner = await page.locator('[data-article-crop-handle="se"]').boundingBox()
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2)
  await page.mouse.down()
  await page.mouse.move(corner.x + corner.width / 2 - 48, corner.y + corner.height / 2 - 28, { steps: 8 })
  await page.mouse.up()
  const resizedCrop = await cropFrame.boundingBox()
  assert.ok(resizedCrop.width < beforeCrop.width - 20, `Угол рамки должен уменьшать кадр: ${JSON.stringify({ beforeCrop, corner, resizedCrop })}`)
  assert.ok(Math.abs(resizedCrop.width / resizedCrop.height - 16 / 9) < 0.04, 'Рамка должна сохранять 16:9')
  await page.mouse.move(resizedCrop.x + resizedCrop.width / 2, resizedCrop.y + resizedCrop.height / 2)
  await page.mouse.down()
  await page.mouse.move(resizedCrop.x + resizedCrop.width / 2 + 16, resizedCrop.y + resizedCrop.height / 2 + 8, { steps: 5 })
  await page.mouse.up()
  const movedCrop = await cropFrame.boundingBox()
  assert.ok(movedCrop.x > resizedCrop.x + 5, 'Рамка должна двигаться поверх оригинала')
  assert.equal(await page.getByRole('slider', { name: /Размер кадра|Положение по/ }).count(), 0)
  await page.screenshot({ path: join(tmpdir(), 'coe-article-crop-frame.png') })
  await page.locator('[data-article-image-crop-toggle]').click()
  assert.equal(await cropFrame.count(), 0, 'Готово закрывает рамку и показывает результат')
  await page.locator('[data-article-image-rotate]').click()
  await page.getByRole('slider', { name: 'Яркость', exact: true }).fill('115')
  await source.focus()
  await source.evaluate(element => { element.setSelectionRange(element.value.length, element.value.length); element.dispatchEvent(new Event('select', { bubbles: true })) })
  await page.locator('[data-article-image-insert]').click()
  assert.match(await source.inputValue(), /!\[Карта региона у моря\]\(article-image:/)
  assert.equal(await page.locator('[data-article-image-delete]').isDisabled(), true)
  checks.push('Фото: загрузка, кадрирование, поворот, цвет, alt/подпись, вставка')

  await page.getByRole('button', { name: 'Карточка сущности', exact: true }).click()
  await page.getByRole('button', { name: 'Вставить карточку: Щит', exact: true }).click()
  assert.match(await source.inputValue(), /\[Щит\]\(entity:123\)/)
  await page.getByRole('radio', { name: 'Предпросмотр', exact: true }).click()
  const preview = page.locator('[data-article-preview]')
  await preview.getByRole('link', { name: 'Открыть в энциклопедии: Щит', exact: true }).waitFor()
  await preview.getByRole('img', { name: 'Карта региона у моря', exact: true }).first().waitFor()
  checks.push('Карточка энциклопедии и обработанная фотография в предпросмотре')

  await page.getByRole('button', { name: /Отложенная отправка/ }).click()
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  await page.locator('dialog input[type="date"]').fill(day)
  await page.locator('dialog input[type="time"]').fill('14:30')
  await page.getByRole('button', { name: 'Сохранить дату', exact: true }).click()
  await page.getByText('Дата сохранена локально · отправка не подключена', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await saved()
  await page.reload()
  await source.waitFor()
  assert.match(await source.inputValue(), /entity:123/)
  await page.getByRole('button', { name: /Дата отправки:/ }).waitFor()
  await page.getByRole('radio', { name: 'Предпросмотр', exact: true }).click()
  await page.locator('[data-article-preview] img').first().waitFor()
  checks.push('Дата отправки и изображения восстановлены; серверная отправка отсутствует')

  await page.evaluate(() => document.fonts.ready)
  const screenshot = join(tmpdir(), 'coe-article-editor-populated.png')
  await page.screenshot({ path: screenshot })
  await page.getByRole('radio', { name: 'Markdown', exact: true }).click()
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 950 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Горизонтальное переполнение при ${width}px`)
    await source.scrollIntoViewIfNeeded()
    assert.equal(await source.isVisible(), true)
  }
  checks.push('Ширины 1440/1024/768/390 px без горизонтального переполнения')
  assert.deepEqual(writes, [], 'Редактор не должен отправлять статьи на сервер до интеграции')
  assert.deepEqual(errors, [], 'Ошибки браузера')
  console.log(JSON.stringify({ passed: checks, screenshot }, null, 2))
} finally {
  await browser.close()
}
