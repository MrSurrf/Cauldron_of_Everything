import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'
import {
  expect,
  userEvent,
} from 'storybook/test'

import { SegmentedControl } from './SegmentedControl'

const rulesetOptions = [
  { value: '2014', label: '2014' },
  { value: '2024', label: '2024' },
] as const

const meta = {
  component: SegmentedControl,
  args: {
    'aria-label': 'Редакция правил',
    defaultValue: '2014',
    options: rulesetOptions,
  },
  argTypes: {
    options: {
      control: false,
    },
  },
} satisfies Meta<typeof SegmentedControl>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const oldRules = canvas.getByRole('radio', {
      name: '2014',
    })
    const newRules = canvas.getByRole('radio', {
      name: '2024',
    })

    await expect(oldRules).toHaveAttribute(
      'aria-checked',
      'true',
    )
    oldRules.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(newRules).toHaveFocus()
    await expect(newRules).toHaveAttribute(
      'aria-checked',
      'true',
    )
  },
}

function ControlledExample() {
  const [value, setValue] = useState('compact')

  return (
    <SegmentedControl
      aria-label="Плотность интерфейса"
      options={[
        { value: 'compact', label: 'Плотно' },
        { value: 'normal', label: 'Обычно' },
        { value: 'comfortable', label: 'Свободно' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  )
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
}

export const WithDisabledOption: Story = {
  args: {
    options: [
      ...rulesetOptions,
      {
        value: 'playtest',
        label: 'Playtest',
        disabled: true,
      },
    ],
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const FormReset: Story = {
  render: () => (
    <form>
      <SegmentedControl
        aria-label="Редакция правил в форме"
        defaultValue="2014"
        name="ruleset"
        options={rulesetOptions}
      />
      <button type="reset">Сбросить</button>
    </form>
  ),
  play: async ({ canvas }) => {
    const oldRules = canvas.getByRole('radio', {
      name: '2014',
    })
    const newRules = canvas.getByRole('radio', {
      name: '2024',
    })

    await userEvent.click(newRules)
    await expect(newRules).toBeChecked()
    await userEvent.click(
      canvas.getByRole('button', { name: 'Сбросить' }),
    )
    await expect(oldRules).toBeChecked()
  },
}
