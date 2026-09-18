import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import {
  expect,
  fn,
  userEvent,
} from 'storybook/test'

import { CollapsibleSection } from './CollapsibleSection'

const meta = {
  component: CollapsibleSection,
  args: {
    children: (
      <p style={{ margin: 0 }}>
        Произвольное содержимое секции листа персонажа.
      </p>
    ),
    defaultOpen: true,
    onMoveDown: fn(),
    onMoveUp: fn(),
    onOpenChange: fn(),
    onRemove: fn(),
    title: 'Особенности происхождения',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(42rem, 100%)' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['ai-generated'],
} satisfies Meta<typeof CollapsibleSection>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', {
      name: 'Свернуть секцию «Особенности происхождения»',
    })

    await expect(toggle).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await userEvent.click(toggle)
    await expect(
      canvas.queryByText(/Произвольное содержимое/),
    ).not.toBeInTheDocument()
  },
}

export const EditableTitle: Story = {
  args: {
    editableTitle: true,
    onTitleChange: fn(),
  },
}
