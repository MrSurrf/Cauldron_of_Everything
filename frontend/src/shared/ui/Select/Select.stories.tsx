import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'

import { Button } from '../Button'
import { Select } from './Select'
import type { SelectOption, SelectProps } from './Select'

const options = [
  { value: 'straight', label: 'Прямая' },
  { value: 'smooth', label: 'Плавная', disabled: true },
  { value: 'elbow', label: 'Ломаная' },
  { value: 'arc', label: 'Дуга' },
  { value: 'step', label: 'Ступенчатая' },
] as const satisfies readonly SelectOption[]

function ControlledExample(props: SelectProps) {
  const [value, setValue] = useState(props.value)

  return (
    <form
      style={{ display: 'grid', gap: 'var(--space-3)' }}
      onSubmit={event => event.preventDefault()}
    >
      <Select
        {...props}
        value={value}
        onValueChange={nextValue => {
          setValue(nextValue)
          props.onValueChange(nextValue)
        }}
      />
      <Button type="button" variant="secondary" size="sm">Продолжить</Button>
    </form>
  )
}

const meta = {
  component: Select,
  args: {
    label: 'Формат линии',
    name: 'lineStyle',
    value: 'straight',
    options,
    onValueChange: fn(),
  },
  argTypes: {
    options: { control: false },
  },
  render: args => <ControlledExample key={args.value ?? 'empty'} {...args} />,
  decorators: [Story => <div style={{ width: '22rem' }}><Story /></div>],
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: { value: 'elbow', disabled: true },
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Формат линии' })

    await expect(trigger).toBeDisabled()
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(canvasElement.querySelector('input[name="lineStyle"]')).toBeDisabled()
  },
}

export const ReadOnly: Story = {
  args: { value: 'elbow', readOnly: true },
  play: async ({ canvas, canvasElement, args }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Формат линии' })

    await expect(trigger).toHaveAttribute('aria-readonly', 'true')
    await expect(trigger).not.toBeDisabled()
    await userEvent.click(trigger)
    await userEvent.keyboard('{ArrowDown}{End}{Enter}с')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveTextContent('Ломаная')
    await expect(canvasElement.querySelector('input[name="lineStyle"]')).toHaveValue('elbow')
    await expect(args.onValueChange).not.toHaveBeenCalled()
  },
}

export const KeyboardNavigation: Story = {
  play: async ({ canvas, canvasElement, args }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Формат линии' })
    const formValue = canvasElement.querySelector('input[name="lineStyle"]')

    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect(await screen.findByRole('listbox')).toBeVisible()
    await expect(screen.getByRole('option', { name: 'Плавная' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{ArrowDown}')
    await expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Ломаная' }).id)
    await expect(formValue).toHaveValue('straight')
    await userEvent.keyboard('{Enter}')
    await expect(trigger).toHaveTextContent('Ломаная')
    await expect(formValue).toHaveValue('elbow')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('elbow')

    await userEvent.keyboard('{End}{Enter}')
    await expect(trigger).toHaveTextContent('Ступенчатая')
    await expect(formValue).toHaveValue('step')
    await userEvent.keyboard('{Home}{Enter}')
    await expect(trigger).toHaveTextContent('Прямая')
    await expect(formValue).toHaveValue('straight')

    await userEvent.keyboard('{Enter}{End}')
    await expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Ступенчатая' }).id)
    await userEvent.keyboard('{Escape}')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveFocus()
    await expect(trigger).toHaveTextContent('Прямая')
    await expect(formValue).toHaveValue('straight')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('straight')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  },
}

export const TypeaheadAndTab: Story = {
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Формат линии' })
    const formValue = canvasElement.querySelector('input[name="lineStyle"]')

    trigger.focus()
    await userEvent.keyboard('{Enter}ло')
    await expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Ломаная' }).id)
    await expect(formValue).toHaveValue('straight')
    await userEvent.keyboard('{Enter}')
    await expect(trigger).toHaveTextContent('Ломаная')
    await expect(formValue).toHaveValue('elbow')

    await userEvent.keyboard('{ArrowDown}{End}')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Продолжить' })).toHaveFocus()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveTextContent('Ломаная')
    await expect(formValue).toHaveValue('elbow')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  },
}
