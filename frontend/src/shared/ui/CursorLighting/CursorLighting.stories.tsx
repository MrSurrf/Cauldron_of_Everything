import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'

import { Panel } from '../Panel'
import { Button } from '../Button'
import { CursorLighting } from './CursorLighting'
import { SheetSection } from '../../../tools/character-sheet/ui/SheetSection'

const meta = {
  component: CursorLighting,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ padding: 'var(--space-7)', minHeight: '100vh' }}>
      <CursorLighting />
      <Panel aria-label="Панель со свечением" role="region">
        <p>Голубой свет проявляется на краю рядом с курсором.</p>
        <Button>Проверить взаимодействие</Button>
        <Panel aria-label="Вложенная панель" role="region" padding="compact">
          Вложенная панель получает собственные координаты света.
        </Panel>
      </Panel>
      <SheetSection aria-label="Секция чарлиста" title="Секция чарлиста">
        Подсветка существующей границы.
      </SheetSection>
    </div>
  ),
} satisfies Meta<typeof CursorLighting>

export default meta
type Story = StoryObj<typeof meta>

export const Reveal: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const panel = canvas.getByRole('region', { name: 'Панель со свечением' })
    const nested = canvas.getByRole('region', { name: 'Вложенная панель' })
    const glow = canvasElement.querySelector<HTMLElement>('.cursor-light')!
    const sheet = canvas.getByRole('region', { name: 'Секция чарлиста' })
    const move = (x: number, y: number, pointerType = 'mouse') => {
      window.dispatchEvent(new PointerEvent('pointermove', {
        clientX: x, clientY: y, pointerType, isPrimary: true,
      }))
    }
    const rect = panel.getBoundingClientRect()
    move(rect.left + 20, rect.top + 1)
    await waitFor(() => {
      expect(glow).toHaveAttribute('data-active', 'true')
      expect(panel.style.getPropertyValue('--cursor-reveal-x')).toBe('20px')
      expect(panel.style.getPropertyValue('--cursor-reveal-y')).toBe('1px')
    })
    expect(getComputedStyle(glow).pointerEvents).toBe('none')
    expect(getComputedStyle(glow).opacity).toBe('0.09')
    expect(nested.style.getPropertyValue('--cursor-reveal-x')).not.toBe('20px')
    expect(getComputedStyle(sheet).borderImageSource).toContain('radial-gradient')

    // Прокрутка/изменение геометрии пересчитывает свет даже без движения мыши.
    panel.style.top = '10px'
    document.dispatchEvent(new Event('scroll'))
    await waitFor(() => expect(panel.style.getPropertyValue('--cursor-reveal-y')).toBe('-9px'))
    panel.style.removeProperty('top')

    // Новые панели (например, после смены маршрута) подключаются автоматически.
    const added = panel.cloneNode(true) as HTMLElement
    added.style.cssText = 'position:fixed;left:10px;top:10px;width:250px'
    canvasElement.append(added)
    try {
      move(12, 12)
      await waitFor(() => expect(added.style.getPropertyValue('--cursor-reveal-x')).toBe('2px'))
    } finally {
      added.remove()
    }

    move(12, 12, 'touch')
    expect(glow).not.toHaveAttribute('data-active')
    expect(panel.style.getPropertyValue('--cursor-reveal-active')).toBe('')
    move(rect.left + 1, rect.top + 1)
    await waitFor(() => expect(glow).toHaveAttribute('data-active', 'true'))
    window.dispatchEvent(new Event('blur'))
    expect(glow).not.toHaveAttribute('data-active')

    const button = canvas.getByRole('button', { name: 'Проверить взаимодействие' })
    await userEvent.click(button)
    await expect(button).toHaveFocus()
    document.documentElement.dispatchEvent(new Event('pointerleave'))
    expect(glow).not.toHaveAttribute('data-active')
    expect(panel.style.getPropertyValue('--cursor-reveal-active')).toBe('')
  },
}
