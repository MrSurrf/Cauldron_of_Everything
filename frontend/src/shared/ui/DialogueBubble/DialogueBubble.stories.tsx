import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { DialogueBubble } from './DialogueBubble'

const meta = {
  component: DialogueBubble,
  tags: ['ai-generated'],
  args: { name: 'Визз', text: 'Привет, путешественник! Давай посмотрим, что здесь можно сделать.', animated: false },
  decorators: [(Story) => <div style={{ padding: '2rem', background: 'var(--color-background)' }}><Story /></div>],
} satisfies Meta<typeof DialogueBubble>
export default meta
type Story = StoryObj<typeof meta>

export const Compact: Story = { args: { variant: 'compact', text: 'Нужна подсказка? Я рядом.' } }
export const Wide: Story = { args: { variant: 'wide', onClose: () => {}, onNext: () => {} } }
export const Story: Story = { args: { variant: 'story', step: 2, total: 3, text: 'В энциклопедии собраны существа, заклинания и правила. Используй поиск, чтобы быстро найти нужный материал.\n\nНедавно открытые записи сохраняются в истории этого браузера — к ним легко вернуться.', onClose: () => {}, onPrevious: () => {}, onNext: () => {} } }
export const Waiting: Story = { args: { variant: 'waiting', onClose: () => {} } }
export const Typewriter: Story = {
  args: { animated: true, onNext: () => {} },
  play: async ({ canvas, canvasElement }) => {
    const bubble = canvasElement.querySelector('section')!
    if (bubble.dataset.typing === 'true') {
      await expect(canvas.queryByRole('button', { name: 'Далее' })).not.toBeInTheDocument()
      await userEvent.click(bubble)
    }
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Показать сразу' })).not.toBeInTheDocument()
  },
}
export const Warm: Story = { args: { name: 'Сукки', text: 'Ну что, проверим эту подсказку?', tone: 'warm', onNext: () => {} } }
