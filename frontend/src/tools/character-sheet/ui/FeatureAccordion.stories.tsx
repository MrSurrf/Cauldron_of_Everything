import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { FeatureAccordion } from './FeatureAccordion'

const meta = {
  component: FeatureAccordion,
  args: {
    description:
      'Бонусным действием вы восстанавливаете хиты, равные 1d10 + уровень воина.',
    formula: (
      <code>1d10 + LEVEL</code>
    ),
    maxUses: 1,
    onDescriptionChange: fn(),
    onMaxUsesChange: fn(),
    onOpenChange: fn(),
    onRecoveryChange: fn(),
    onTitleChange: fn(),
    onUsedChange: fn(),
    recovery: 'short-rest',
    title: 'Второе дыхание',
    used: 0,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(42rem, 100%)' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['ai-generated'],
} satisfies Meta<typeof FeatureAccordion>

export default meta

type Story = StoryObj<typeof meta>

export const Opened: Story = {
  args: {
    open: true,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByLabelText(/Описание способности/),
    ).toBeVisible()
    await expect(
      canvas.getByText('1d10 + LEVEL'),
    ).toBeVisible()
  },
}

export const Closed: Story = {
  args: {
    open: false,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByLabelText(/Описание способности/),
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByRole('button', {
        name: 'Развернуть секцию «Второе дыхание»',
      }),
    ).toHaveAttribute('aria-expanded', 'false')
  },
}
