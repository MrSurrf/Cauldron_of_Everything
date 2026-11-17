import { describe, expect, it } from 'vitest'

import { parseContentSource } from './contentCodec'
import {
  emptySection,
  isSectionVisibleTo,
  sectionFromBlock,
  sectionToSource,
} from './sectionContent'

function parseSection(source: string) {
  const block = parseContentSource(source)[0]

  if (!block || block.kind !== 'collapsible') {
    throw new Error('Ожидался раскрываемый раздел')
  }

  return block
}

describe('content section codec', () => {
  it('читает прежний open и считает отсутствующую видимость наследуемой', () => {
    const value = sectionFromBlock(parseSection([
      ':::collapsible[Старая вкладка]{open=true}',
      'Содержимое',
      ':::',
    ].join('\n')))

    expect(value).toMatchObject({
      body: 'Содержимое',
      defaultOpen: true,
      title: 'Старая вкладка',
      visibility: 'inherit',
    })
  })

  it('сохраняет открытие и явную аудиторию без потери неизвестных атрибутов', () => {
    const source = sectionToSource({
      ...emptySection,
      body: 'Секрет',
      defaultOpen: true,
      title: 'Планы',
      visibility: 'master',
    }, { future: 'kept' })
    const block = parseSection(source)

    expect(block.attributes).toMatchObject({
      future: 'kept',
      open: 'true',
      visibility: 'master',
    })
    expect(sectionFromBlock(block)).toMatchObject({
      defaultOpen: true,
      visibility: 'master',
    })
  })

  it('удаляет служебные атрибуты для совместимых значений по умолчанию', () => {
    const source = sectionToSource(emptySection, {
      'default-open': 'true',
      open: 'true',
      visibility: 'players',
    })
    const block = parseSection(source)

    expect(block.attributes.open).toBeUndefined()
    expect(block.attributes['default-open']).toBeUndefined()
    expect(block.attributes.visibility).toBeUndefined()
    expect(sectionFromBlock(block)).toMatchObject({
      defaultOpen: false,
      visibility: 'inherit',
    })
  })

  it.each([
    ['master', 'master', true],
    ['players', 'master', true],
    ['public', 'master', true],
    ['master', 'players', false],
    ['players', 'players', true],
    ['public', 'players', true],
    ['players', 'public', false],
    ['public', 'public', true],
    ['inherit', 'players', true],
    ['inherit', 'public', true],
  ] as const)(
    'проверяет видимость %s для %s',
    (visibility, audience, expected) => {
      expect(isSectionVisibleTo(
        visibility,
        audience,
        'public',
      )).toBe(expected)
    },
  )

  it('наследует ограничение родительского раздела', () => {
    expect(isSectionVisibleTo('inherit', 'players', 'master')).toBe(false)
    expect(isSectionVisibleTo('inherit', 'master', 'master')).toBe(true)
  })
})
