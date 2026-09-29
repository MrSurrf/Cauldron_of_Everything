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

it('прокручивает горизонтальную строку вертикальным колесом и отдаёт событие странице на краях', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    root.render(<ScrollArea orientation="horizontal" aria-label="Карточки" rootStyle={{ width: 300, height: 140 }}>
      <div style={{ width: 1200, height: 100 }} />
    </ScrollArea>)
    await expect.poll(() => host.querySelectorAll('input[type="range"]').length).toBe(1)
    const viewport = host.querySelector<HTMLElement>('[role="region"]')!
    const wheel = (deltaY: number, init: WheelEventInit = {}) => {
      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY, ...init })
      viewport.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(wheel(-100)).toBe(false)
    expect(wheel(120)).toBe(true)
    await expect.poll(() => viewport.scrollLeft).toBeGreaterThan(0)
    expect(wheel(40, { deltaX: 90 })).toBe(false)
    expect(wheel(40, { ctrlKey: true })).toBe(false)
    viewport.scrollTo({ left: viewport.scrollWidth, behavior: 'instant' })
    expect(wheel(100)).toBe(false)
  } finally {
    root.unmount()
    host.remove()
  }
})

it('сохраняет обычное колесо в области с двумя осями', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    root.render(<ScrollArea orientation="both" aria-label="Две оси" rootStyle={{ width: 300, height: 140 }}>
      <div style={{ width: 1200, height: 1200 }} />
    </ScrollArea>)
    await expect.poll(() => host.querySelectorAll('input[type="range"]').length).toBe(2)
    const viewport = host.querySelector<HTMLElement>('[role="region"]')!
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 })
    viewport.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  } finally {
    root.unmount()
    host.remove()
  }
})
