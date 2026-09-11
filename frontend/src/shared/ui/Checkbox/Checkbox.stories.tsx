import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  fn,
  userEvent,
} from 'storybook/test'

import { Checkbox } from './Checkbox'

const checkedChange = fn()

const meta = {
  component: Checkbox,
  args: {
    label: 'Владение навыком',
    onCheckedChange: checkedChange,
  },
  argTypes: {
    description: {
      control: 'text',
    },
    label: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole('checkbox', {
      name: 'Владение навыком',
    })

    await expect(checkbox).not.toBeChecked()
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
    await expect(checkedChange).toHaveBeenCalledWith(
      true,
      expect.anything(),
    )
  },
}

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
}

export const Indeterminate: Story = {
  args: {
    indeterminate: true,
    label: 'Выбрана часть элементов',
  },
}

export const WithDescription: Story = {
  args: {
    description:
      'Бонус мастерства добавляется к проверке.',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}
