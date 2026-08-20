import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'

import {
  FormulaField,
  type FormulaFieldProps,
} from './FormulaField'

function StatefulFormulaField(
  props: FormulaFieldProps,
) {
  const [value, setValue] = useState(props.value)

  return (
    <FormulaField
      {...props}
      value={value}
      onValueChange={setValue}
    />
  )
}

const meta = {
  component: FormulaField,
  decorators: [
    (Story) => (
      <div
        style={{
          width: '20rem',
          padding: 'var(--space-5)',
          background: 'var(--color-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <StatefulFormulaField {...args} />
  ),
  args: {
    defaultFormula: '10 + DEX_MOD',
    label: 'Класс доспеха',
    onValueChange: () => undefined,
    result: { status: 'ok', value: 15 },
    value: {
      formulaOverride: null,
      manualValue: 10,
      mode: 'manual',
    },
    variables: [
      { key: 'DEX_MOD', label: 'Модификатор ловкости' },
      { key: 'ARMOR_BONUS', label: 'Бонус брони' },
    ],
  },
} satisfies Meta<typeof FormulaField>

export default meta

type Story = StoryObj<typeof meta>

export const Manual: Story = {}

export const Formula: Story = {
  args: {
    value: {
      formulaOverride: null,
      manualValue: 10,
      mode: 'formula',
    },
  },
}

export const FormulaError: Story = {
  args: {
    result: {
      status: 'error',
      value: null,
      error: 'Неизвестная переменная ARMOR_CLASS',
    },
    value: {
      formulaOverride: '10 + ARMOR_CLASS',
      manualValue: 10,
      mode: 'formula',
    },
  },
}

export const CompactListValue: Story = {
  args: {
    accessibleLabel: 'Восприятие (WIS)',
    label: 'Восприятие',
    labelDetail: '(WIS)',
    presentation: 'list',
    prefixPositive: true,
    value: {
      formulaOverride: null,
      manualValue: 10,
      mode: 'formula',
    },
  },
}

export const ArmorClassShield: Story = {
  args: {
    label: 'Класс защиты',
    presentation: 'shield',
    value: {
      formulaOverride: null,
      manualValue: 10,
      mode: 'formula',
    },
  },
}
