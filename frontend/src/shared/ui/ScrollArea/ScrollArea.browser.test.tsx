import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ScrollArea } from './ScrollArea'
import '../../styles/tokens.css'

it('анимирует кнопки по обеим осям, но перемещает ползунок без отставания', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    root.render(<ScrollArea orientation="both" aria-label="Проверка плавности" rootStyle={{ width: 300, height: 200 }}>
      <div style={{ width: 1200, height: 1200 }} />
    </ScrollArea>)
    await expect.poll(() => host.querySelectorAll('input[type="range"]').length).toBe(2)
    const viewport = host.querySelector<HTMLElement>('[role="region"]')!
    for (const [label, axis] of [['Прокрутить вправо', 'scrollLeft'], ['Прокрутить вниз', 'scrollTop']] as const) {
      const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
      // После команды позиция ещё не конечная: движение выполняет браузер.
      button.click()
      const start = viewport[axis]
      await expect.poll(() => viewport[axis]).toBeGreaterThan(start)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    const slider = host.querySelector<HTMLInputElement>('input[aria-orientation="horizontal"]')!
    await userEvent.click(slider)
    expect(viewport.scrollLeft).toBeGreaterThan(100)
    expect(Math.abs(Number(slider.value) - viewport.scrollLeft)).toBeLessThan(2)
  } finally {
    root.unmount()
    host.remove()
  }
})
