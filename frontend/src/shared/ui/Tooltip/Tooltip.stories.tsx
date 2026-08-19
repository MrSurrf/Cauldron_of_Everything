import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'
import {
  expect,
  screen,
  userEvent,
  waitFor,
} from 'storybook/test'

import { Tooltip } from './Tooltip'

const triggerStyle = {
  minWidth: 'var(--control-height-md)',
  minHeight: 'var(--control-height-md)',
  border:
    'var(--border-width-default) solid var(--color-content-border)',
  background: 'var(--color-surface-default)',
  color: 'var(--color-text-primary)',
}

const meta = {
  component: Tooltip,
  args: {
    children: (
      <button type="button" style={triggerStyle}>
        ?
      </button>
    ),
    content: 'Подсказка к действию',
    openDelay: 0,
  },
  argTypes: {
    children: {
      control: false,
    },
    content: {
      control: 'text',
    },
    placement: {
      control: 'select',
      options: [
        'top',
        'right',
        'bottom',
        'left',
      ],
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          minHeight: '12rem',
          placeItems: 'center',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>

export default meta

type Story = StoryObj<typeof meta>

function DisabledDuringDelayExample() {
  const [disabled, setDisabled] =
    useState(false)

  return (
    <div>
      <Tooltip
        content="Не должна открыться"
        disabled={disabled}
        openDelay={200}
      >
        <button type="button" style={triggerStyle}>
          Цель
        </button>
      </Tooltip>

      <button
        type="button"
        onClick={() => {
          setDisabled((current) => !current)
        }}
      >
        Переключить disabled
      </button>
    </div>
  )
}

export const Default: Story = {}

export const Placements: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-6)',
      }}
    >
      {(
        [
          'top',
          'right',
          'bottom',
          'left',
        ] as const
      ).map((placement) => (
        <Tooltip
          key={placement}
          content={placement}
          defaultOpen={true}
          placement={placement}
        >
          <button
            type="button"
            style={triggerStyle}
          >
            {placement}
          </button>
        </Tooltip>
      ))}
    </div>
  ),
}

export const DisabledDuringDelay: Story = {
  render: () => <DisabledDuringDelayExample />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', {
      name: 'Цель',
    })
    const toggle = canvas.getByRole('button', {
      name: 'Переключить disabled',
    })

    await userEvent.hover(trigger)
    toggle.click()
    await new Promise((resolve) => {
      setTimeout(resolve, 260)
    })
    await expect(
      screen.queryByRole('tooltip'),
    ).not.toBeInTheDocument()

    toggle.click()
    await expect(
      screen.queryByRole('tooltip'),
    ).not.toBeInTheDocument()
  },
}

export const HoverAndKeyboard: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button')

    await userEvent.hover(trigger)
    await expect(
      await screen.findByRole('tooltip'),
    ).toHaveTextContent('Подсказка к действию')

    await userEvent.unhover(trigger)
    await waitFor(() => {
      expect(
        screen.queryByRole('tooltip'),
      ).not.toBeInTheDocument()
    })

    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await waitFor(() => {
      expect(
        screen.getByRole('tooltip'),
      ).toBeVisible()
    })

    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(
        screen.queryByRole('tooltip'),
      ).not.toBeInTheDocument()
    })
  },
}
