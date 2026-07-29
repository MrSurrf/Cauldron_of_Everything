import type {
  Meta,
  StoryObj,
} from '@storybook/react-vite'
import { useState } from 'react'
import {
  expect,
  fireEvent,
  userEvent,
  waitFor,
} from 'storybook/test'

import { Panel } from '../Panel'
import { ScrollArea } from './ScrollArea'

const verticalItems = Array.from(
  { length: 24 },
  (_, index) => `Запись ${index + 1}`,
)

const itemStyle = {
  minHeight: 'var(--control-height-md)',
  padding: 'var(--space-3)',
  border:
    'var(--border-width-default) solid var(--color-border-default)',
  color: 'var(--color-text-secondary)',
  background: 'var(--color-surface-muted)',
}

function VerticalContent({
  items = verticalItems,
}: {
  items?: string[]
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
      }}
    >
      {items.map((item) => (
        <div key={item} style={itemStyle}>
          {item}
        </div>
      ))}
    </div>
  )
}

function HorizontalContent() {
  return (
    <div
      style={{
        display: 'grid',
        width: 'max-content',
        gridAutoColumns: '10rem',
        gridAutoFlow: 'column',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
      }}
    >
      {verticalItems.slice(0, 8).map((item) => (
        <div key={item} style={itemStyle}>
          {item}
        </div>
      ))}
    </div>
  )
}

function DynamicContentExample() {
  const [expanded, setExpanded] =
    useState(false)

  return (
    <div
      style={{
        display: 'grid',
        width: '24rem',
        gap: 'var(--space-3)',
      }}
    >
      <button
        type={'button'}
        onClick={() => {
          setExpanded((current) => !current)
        }}
      >
        {expanded
          ? 'Уменьшить содержимое'
          : 'Увеличить содержимое'}
      </button>

      <ScrollArea
        aria-label={'Динамический список'}
        role={'region'}
        rootStyle={{ height: '12rem' }}
        tabIndex={0}
      >
        <VerticalContent
          items={
            expanded
              ? verticalItems
              : verticalItems.slice(0, 2)
          }
        />
      </ScrollArea>
    </div>
  )
}

const meta = {
  component: ScrollArea,
  tags: ['ai-generated'],
  args: {
    'aria-label': 'Список персонажей',
    orientation: 'vertical',
    role: 'region',
    tabIndex: 0,
  },
  argTypes: {
    children: {
      control: false,
    },
    orientation: {
      control: 'inline-radio',
      options: [
        'horizontal',
        'vertical',
        'both',
      ],
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '24rem',
          padding: 'var(--space-5)',
          background: 'var(--color-background)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScrollArea>

export default meta

type Story = StoryObj<typeof meta>

export const Vertical: Story = {
  args: {
    children: <VerticalContent />,
    rootStyle: {
      width: '24rem',
      height: '16rem',
    },
  },
  play: async ({ canvas }) => {
    const viewport = canvas.getByRole('region', {
      name: 'Список персонажей',
    })
    const scrollBar = await canvas.findByRole(
      'slider',
      {
        name:
          'Вертикальная прокрутка: Список персонажей',
      },
    )
    const maximum =
      viewport.scrollHeight -
      viewport.clientHeight

    await expect(scrollBar).toHaveAttribute(
      'aria-controls',
      viewport.id,
    )
    await expect(scrollBar).toHaveAttribute(
      'max',
      String(maximum),
    )

    fireEvent.change(scrollBar, {
      target: { value: maximum },
    })

    await expect(
      viewport.scrollTop,
    ).toBeGreaterThan(0)
    await waitFor(() => {
      expect(scrollBar).toHaveValue(
        String(maximum),
      )
    })

    viewport.scrollTop = 0
    fireEvent.scroll(viewport)

    await waitFor(() => {
      expect(scrollBar).toHaveValue('0')
    })
  },
}

export const Horizontal: Story = {
  args: {
    'aria-label': 'Горизонтальная коллекция',
    children: <HorizontalContent />,
    orientation: 'horizontal',
    rootStyle: {
      width: '24rem',
      height: '9rem',
    },
  },
  play: async ({ canvas }) => {
    const viewport = canvas.getByRole('region', {
      name: 'Горизонтальная коллекция',
    })
    const scrollBar = await canvas.findByRole(
      'slider',
      {
        name:
          'Горизонтальная прокрутка: Горизонтальная коллекция',
      },
    )
    const maximum =
      viewport.scrollWidth -
      viewport.clientWidth

    await expect(scrollBar).toHaveAttribute(
      'aria-orientation',
      'horizontal',
    )
    await expect(scrollBar).toHaveAttribute(
      'max',
      String(maximum),
    )

    fireEvent.change(scrollBar, {
      target: { value: maximum },
    })

    await expect(
      viewport.scrollLeft,
    ).toBeGreaterThan(0)
  },
}

export const HorizontalRtl: Story = {
  args: {
    'aria-label': 'Коллекция справа налево',
    children: <HorizontalContent />,
    dir: 'rtl',
    orientation: 'horizontal',
    rootStyle: {
      width: '24rem',
      height: '9rem',
    },
  },
  play: async ({ canvas }) => {
    const viewport = canvas.getByRole('region', {
      name: 'Коллекция справа налево',
    })
    const scrollBar = await canvas.findByRole(
      'slider',
      {
        name:
          'Горизонтальная прокрутка: Коллекция справа налево',
      },
    )
    const maximum = Number(
      scrollBar.getAttribute('max'),
    )

    await expect(scrollBar).toHaveValue(
      String(maximum),
    )
    await expect(
      canvas.getByRole('button', {
        name: 'Прокрутить вправо',
      }),
    ).toBeDisabled()

    fireEvent.change(scrollBar, {
      target: { value: 0 },
    })

    await expect(viewport.scrollLeft).toBeLessThan(0)
    await waitFor(() => {
      expect(scrollBar).toHaveValue('0')
    })
  },
}

export const BothAxes: Story = {
  args: {
    'aria-label': 'Большая схема',
    children: (
      <div
        style={{
          display: 'grid',
          width: '48rem',
          minHeight: '28rem',
          padding: 'var(--space-5)',
          placeItems: 'center',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface-muted)',
        }}
      >
        Область с двумя направлениями прокрутки
      </div>
    ),
    orientation: 'both',
    rootStyle: {
      width: '24rem',
      height: '15rem',
    },
  },
  play: async ({ canvas }) => {
    const sliders =
      await canvas.findAllByRole('slider')

    await expect(sliders).toHaveLength(2)
    await expect(
      canvas.getByRole('slider', {
        name:
          'Вертикальная прокрутка: Большая схема',
      }),
    ).toHaveAttribute(
      'aria-orientation',
      'vertical',
    )
    await expect(
      canvas.getByRole('slider', {
        name:
          'Горизонтальная прокрутка: Большая схема',
      }),
    ).toHaveAttribute(
      'aria-orientation',
      'horizontal',
    )
  },
}

export const NoOverflow: Story = {
  args: {
    children: (
      <div
        style={{
          padding: 'var(--space-3)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Короткое содержимое
      </div>
    ),
    rootStyle: {
      width: '24rem',
      height: '12rem',
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('slider'),
    ).not.toBeInTheDocument()
  },
}

export const DynamicContent: Story = {
  render: () => <DynamicContentExample />,
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('slider'),
    ).not.toBeInTheDocument()

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Увеличить содержимое',
      }),
    )

    await expect(
      await canvas.findByRole('slider', {
        name:
          'Вертикальная прокрутка: Динамический список',
      }),
    ).toBeInTheDocument()

    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Уменьшить содержимое',
      }),
    )

    await waitFor(() => {
      expect(
        canvas.queryByRole('slider'),
      ).not.toBeInTheDocument()
    })
  },
}

export const NestedAreas: Story = {
  render: () => (
    <ScrollArea
      aria-label={'Внешняя область'}
      orientation={'both'}
      role={'region'}
      rootStyle={{
        width: '28rem',
        height: '18rem',
      }}
    >
      <div
        style={{
          width: '24rem',
          padding: 'var(--space-3)',
        }}
      >
        <ScrollArea
          aria-label={'Вложенный список'}
          orientation={'vertical'}
          role={'region'}
          rootStyle={{ height: '12rem' }}
          tabIndex={0}
        >
          <VerticalContent />
        </ScrollArea>
      </div>
    </ScrollArea>
  ),
  play: async ({ canvas }) => {
    const innerViewport = canvas.getByRole(
      'region',
      {
        name: 'Вложенный список',
      },
    )

    await expect(
      await canvas.findByRole('slider', {
        name:
          'Вертикальная прокрутка: Вложенный список',
      }),
    ).toBeInTheDocument()
    await expect(
      canvas.queryByRole('slider', {
        name:
          'Вертикальная прокрутка: Внешняя область',
      }),
    ).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole('slider', {
        name:
          'Горизонтальная прокрутка: Внешняя область',
      }),
    ).not.toBeInTheDocument()
    await expect(
      getComputedStyle(innerViewport).overflowX,
    ).toBe('hidden')
  },
}

export const InsidePanel: Story = {
  render: () => (
    <Panel
      padding={'none'}
      style={{
        width: '30rem',
        height: '18rem',
      }}
    >
      <ScrollArea
        aria-label={'Содержимое панели'}
        role={'region'}
        rootStyle={{ height: '100%' }}
        tabIndex={0}
      >
        <VerticalContent />
      </ScrollArea>
    </Panel>
  ),
}
