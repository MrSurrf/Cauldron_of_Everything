import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1250, height: 1200 }, deviceScaleFactor: 2 })
  await page.goto('http://localhost:6008/iframe.html?id=tools-character-sheet-charactersheettool--full-character-sheet&viewMode=story')
  await page.locator('[data-character-sheet-page]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.locator('[data-character-sheet-column="left"]').screenshot({ path: 'node_modules/.cache/character-sheet-numeric.png' })
  console.log(await page.locator('[data-character-sheet-column="left"]').evaluate(el => {
    const rect = e => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} }
    return {
      skills: Array.from(el.querySelectorAll('[data-skill-row]')).map(row => ({ text: row.textContent, rect:rect(row), abbr:rect(row.querySelector('small')) })),
      numbers: Array.from(el.querySelectorAll('[data-numeric-frame]')).slice(0,10).map(frame => ({html:frame.outerHTML, color:getComputedStyle(frame.firstElementChild).color})),
    }
  }))
} finally {
  await browser.close()
}
