import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  userEvent,
  waitFor,
} from 'storybook/test'

import { MenuButton } from './MenuButton'

function ToolDropdown() {
  return (
    <>
      <MenuButton>
        Генератор встреч
      </MenuButton>
      <MenuButton>
        Генератор наград
      </MenuButton>
    </>
  )
}

const meta = {
  component: MenuButton,
  tags: ['ai-generated'],
  args: {
    children: 'Главная',
  },
  argTypes: {
    dropdown: {
      control: false,
    },
    icon: {
      control: false,
    },
    onExpandedChange: {
      action: 'expanded changed',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '18rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = {
  args: {
    active: true,
  },
}

export const Expandable: Story = {
  args: {
    children: 'Инструменты',
    dropdown: <ToolDropdown />,
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', {
      name: 'Инструменты',
    })

    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await waitFor(() => {
      expect(
        canvas.getByRole('group'),
      ).toBeVisible()
    })
    await expect(
      canvas.getByRole('button', {
        name: 'Генератор встреч',
      }),
    ).toBeVisible()
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const MainMenuPreview: Story = {
  render: () => (
    <nav
      aria-label={'Главное меню'}
      style={{
        display: 'grid',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        background: 'var(--color-surface-default)',
      }}
    >
      <MenuButton active={true}>
        Главная
      </MenuButton>
      <MenuButton>
        Опросник
      </MenuButton>
      <MenuButton dropdown={<ToolDropdown />}>
        Инструменты
      </MenuButton>
      <MenuButton>
        Библиотека
      </MenuButton>
      <MenuButton>
        Настройки
      </MenuButton>
    </nav>
  ),
}
