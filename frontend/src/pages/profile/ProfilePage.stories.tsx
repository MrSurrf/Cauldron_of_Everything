import type { Meta, StoryObj } from '@storybook/react-vite'
import ProfilePage from './ProfilePage'

const meta = {
  component: ProfilePage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProfilePage>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
