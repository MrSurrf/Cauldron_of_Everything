import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'

import { SiteHeader } from '../../app/layouts/SiteHeader'
import HomePage from './HomePage'

const meta = {
  title: 'Pages/HomePage',
  component: HomePage,
  parameters: { layout: 'fullscreen' },
  decorators: [Story => <MemoryRouter initialEntries={['/']}><SiteHeader /><Story /></MemoryRouter>],
} satisfies Meta<typeof HomePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
