import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'
import {
  expect,
  fn,
  userEvent,
} from 'storybook/test'

import { Checkbox } from './Checkbox'
import { EquippedIcon } from '../icons'

const checkedChange = fn()

const meta = {
  component: Checkbox,
  tags: ['ai-generated'],
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
    checkedChange.mockClear()
    const checkbox = canvas.getByRole('checkbox', {
      name: 'Владение навыком',
    })

    await expect(checkbox).not.toBeChecked()
    await userEvent.click(checkbox.closest('label')!)
    await expect(checkbox).toBeChecked()
    await expect(checkedChange).toHaveBeenCalledTimes(1)
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

function ControlledExample() {
  const [checked, setChecked] = useState(false)

  return (
    <Checkbox
      checked={checked}
      label="Учитывать модификатор"
      onCheckedChange={setChecked}
    />
  )
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
}

export const IconIndicator: Story = {
  render: () => (
    <Checkbox
      aria-label="Надето"
      indicator={<EquippedIcon />}
    />
  ),
}

export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <Checkbox label="Не выбрано" />
      <Checkbox defaultChecked label="Выбрано" />
      <Checkbox indeterminate label="Частично выбрано" />
      <Checkbox disabled label="Недоступно" />
    </div>
  ),
}

const keyboardChange = fn()

export const KeyboardActivation: Story = {
  args: {
    label: 'Переключить с клавиатуры',
    onCheckedChange: keyboardChange,
  },
  play: async ({ canvas }) => {
    keyboardChange.mockClear()
    const checkbox = canvas.getByRole('checkbox', {
      name: 'Переключить с клавиатуры',
    })

    await userEvent.tab()
    await expect(checkbox).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(checkbox).toBeChecked()
    await expect(keyboardChange).toHaveBeenCalledTimes(1)
  },
}

export const FormReset: Story = {
  render: () => (
    <form>
      <Checkbox label="Сохранять результат" />
      <button type="reset">Сбросить</button>
    </form>
  ),
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole('checkbox', {
      name: 'Сохранять результат',
    })

    await userEvent.click(checkbox.closest('label')!)
    await expect(checkbox).toBeChecked()
    await userEvent.click(
      canvas.getByRole('button', { name: 'Сбросить' }),
    )
    await expect(checkbox).not.toBeChecked()
    await expect(checkbox.closest('label')).toHaveAttribute(
      'data-state',
      'unchecked',
    )
  },
}
