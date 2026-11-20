import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'

import ArticlesPage from './ArticlesPage'

const meta = {
  title: 'Pages/ArticlesPage',
  component: ArticlesPage,
  parameters: { layout: 'fullscreen' },
  decorators: [Story => <MemoryRouter><Story /></MemoryRouter>],
} satisfies Meta<typeof ArticlesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Catalog: Story = {}
