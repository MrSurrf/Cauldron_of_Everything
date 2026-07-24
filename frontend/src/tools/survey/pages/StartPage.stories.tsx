import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import StartPage from './StartPage'

const meta = {
  component: StartPage,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onStart: fn(),
  },
} satisfies Meta<typeof StartPage>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const SubmitsTrimmedName: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByRole('textbox')
    const submit = canvas.getByRole('button')

    await expect(submit).toBeDisabled()
    await userEvent.type(input, '  Анна  ')
    await expect(submit).toBeEnabled()
    await userEvent.click(submit)
    await expect(args.onStart).toHaveBeenCalledWith(
      'Анна',
      '',
    )
  },
}
