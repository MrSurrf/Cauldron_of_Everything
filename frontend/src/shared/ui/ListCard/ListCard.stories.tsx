import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { PlaceholderIcon } from '../icons'
import { ListCard } from './ListCard'

const meta = { component: ListCard, args: { name: 'Бестиарий', tags: ['Существа, монстры и противники.'] } } satisfies Meta<typeof ListCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { metric: 'ПО 1' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('ПО 1')).toBeInTheDocument()
    await expect(canvas.getByText('Бестиарий')).toBeInTheDocument()
  },
}
export const Navigation: Story = {
  args: { appearance: 'navigation', icon: <PlaceholderIcon /> },
  decorators: [Story => <a href="#bestiary" style={{ display: 'block', width: '14rem', textDecoration: 'none' }}><Story /></a>],
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link')
    const card = link.querySelector<HTMLElement>('[data-appearance="navigation"]')!
    expect(card.querySelector('[class*="innerFrame"]')).toBeNull()
    expect(card.querySelector('svg')).not.toBeNull()
    expect(getComputedStyle(card, '::after').display).toBe('none')
  },
}
