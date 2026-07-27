import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'

import FinalPage from './FinalPage'

const meta = {
  component: FinalPage,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof FinalPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
