import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  screen,
  userEvent,
  waitFor,
} from 'storybook/test'

import { Popover } from './Popover'
import { Tooltip } from '../Tooltip'

const triggerStyle = {
  minHeight: 'var(--control-height-sm)',
  padding: '0 var(--space-3)',
  border:
    'var(--border-width-default) solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-default)',
  color: 'var(--color-text-primary)',
}

const meta = {
  component: Popover,
  args: {
    'aria-label': 'Настройки поля',
    children: (
      <button type="button" style={triggerStyle}>
        Настроить
      </button>
    ),
    content: (
      <div>
        <strong>Формула</strong>
        <p>10 + DEX_MOD</p>
        <button type="button">Сохранить</button>
      </div>
    ),
  },
  argTypes: {
    children: {
      control: false,
    },
    content: {
      control: false,
    },
    placement: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          minHeight: '15rem',
          placeItems: 'center',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Popover>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', {
      name: 'Настроить',
    })

    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const dialog = await screen.findByRole('dialog', {
        name: 'Настройки поля',
      })

    await waitFor(() => {
      expect(dialog).toBeVisible()
    })
    await expect(
      screen.getByRole('button', {
        name: 'Сохранить',
      }),
    ).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog'),
      ).not.toBeInTheDocument()
    })
    await expect(trigger).toHaveFocus()
  },
}

export const InitiallyOpen: Story = {
  args: {
    defaultOpen: true,
  },
}

export const MatchTriggerWidth: Story = {
  args: {
    matchTriggerWidth: true,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', {
        name: 'Настроить',
      }),
    ).toBeDisabled()
  },
}

export const TooltipWrappedTrigger: Story = {
  args: {
    children: (
      <Tooltip content="Подсказка">
        <button type="button" style={triggerStyle}>
          Настроить
        </button>
      </Tooltip>
    ),
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', {
      name: 'Настроить',
    })

    await userEvent.click(trigger)
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', {
          name: 'Настройки поля',
        }),
      ).toBeVisible()
    })
  },
}
