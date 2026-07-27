import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  userEvent,
} from 'storybook/test'

import { ScrollBar } from './ScrollBar'

const meta = {
  component: ScrollBar,
  tags: ['ai-generated'],
  args: {
    'aria-label': 'Положение прокрутки',
    defaultValue: 45,
    orientation: 'horizontal',
  },
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
    onValueChange: {
      action: 'value changed',
    },
  },
} satisfies Meta<typeof ScrollBar>

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: (args) => (
    <div style={{ width: '18rem' }}>
      <ScrollBar {...args} />
    </div>
  ),
}

export const Vertical: Story = {
  args: {
    'aria-label': 'Вертикальная прокрутка',
    defaultValue: 35,
    orientation: 'vertical',
  },
  render: (args) => (
    <div style={{ height: '14rem' }}>
      <ScrollBar {...args} />
    </div>
  ),
}

export const BothOrientations: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        width: '20rem',
        height: '12rem',
        gridTemplateColumns: '1fr auto',
        gridTemplateRows: '1fr auto',
        gap: 'var(--space-3)',
      }}
    >
      <div />
      <ScrollBar
        aria-label={'Вертикальная прокрутка'}
        orientation={'vertical'}
        defaultValue={38}
      />
      <ScrollBar
        aria-label={'Горизонтальная прокрутка'}
        defaultValue={62}
      />
    </div>
  ),
}

export const StepButtons: Story = {
  args: {
    defaultValue: 40,
    step: 10,
  },
  render: (args) => (
    <div style={{ width: '18rem' }}>
      <ScrollBar {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const slider = canvas.getByRole('slider')
    const increment = canvas.getByRole('button', {
      name: 'Прокрутить вправо',
    })

    await expect(slider).toHaveValue(40)
    await userEvent.click(increment)
    await expect(slider).toHaveValue(50)
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <div style={{ width: '18rem' }}>
      <ScrollBar {...args} />
    </div>
  ),
}
