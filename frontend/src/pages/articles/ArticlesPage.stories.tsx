import type { Meta, StoryObj } from '@storybook/react-vite'

import ArticlesPage from './ArticlesPage'

const meta = {
  title: 'Pages/ArticlesPage',
  component: ArticlesPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ArticlesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Catalog: Story = {}
