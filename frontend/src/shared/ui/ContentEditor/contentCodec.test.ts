import { describe, expect, it } from 'vitest'

import {
  parseContentInline,
  parseContentSource,
  safeContentLinkTarget,
} from './contentCodec'

describe('content codec', () => {
  it('разбирает старый формат заметок без потери исходного текста', () => {
    const source = [
      '# Тактика',
      'Обычный **важный** текст',
      '',
      '- первый пункт',
      '- второй пункт',
      '',
      '1. первый шаг',
      '2) второй шаг',
      '',
      '- [x] использовано',
      '- [ ] доступно',
      '',
      '---',
      '',
      ':::resource[Второе дыхание]{current=1 maximum=2 recovery=short source=feature:second-wind}',
      'Восстанавливает [[roll:1d10+2]] хитов.',
      ':::',
      '',
      ':::collapsible[Дополнительная тактика]{open=true}',
      'Неизвестная @@ разметка остаётся текстом.',
      ':::',
    ].join('\n')

    const blocks = parseContentSource(source)

    expect(blocks.map((block) => block.kind)).toEqual([
      'heading',
      'paragraph',
      'list',
      'list',
      'list',
      'divider',
      'resource',
      'collapsible',
    ])

    const resource = blocks[6]
    expect(resource.kind).toBe('resource')

    if (resource.kind === 'resource') {
      expect(resource.title).toBe('Второе дыхание')
      expect(resource.attributes).toMatchObject({
        current: '1',
        maximum: '2',
        recovery: 'short',
        source: 'feature:second-wind',
      })
      expect(resource.body[0]).toMatchObject({
        kind: 'paragraph',
        lines: ['Восстанавливает [[roll:1d10+2]] хитов.'],
      })
      expect(
        source.slice(
          resource.sourceRange.start,
          resource.sourceRange.end,
        ),
      ).toBe(resource.rawSource)
      expect(
        source.slice(
          resource.headerRange.start,
          resource.headerRange.end,
        ),
      ).toBe(
        ':::resource[Второе дыхание]{current=1 maximum=2 recovery=short source=feature:second-wind}',
      )
    }

    const collapsible = blocks[7]
    expect(collapsible.kind).toBe('collapsible')

    if (collapsible.kind === 'collapsible') {
      expect(collapsible.attributes).toEqual({ open: 'true' })
      expect(collapsible.rawSource).toContain(
        'Неизвестная @@ разметка остаётся текстом.',
      )
    }
  })

  it('оставляет незакрытые и неизвестные директивы обычным текстом', () => {
    const source = [
      ':::resource[Без завершения]{current=1}',
      'Текст не должен исчезнуть',
      ':::unknown[Новый тип]',
    ].join('\n')

    expect(parseContentSource(source)).toEqual([
      expect.objectContaining({
        kind: 'paragraph',
        lines: [
          ':::resource[Без завершения]{current=1}',
          'Текст не должен исчезнуть',
          ':::unknown[Новый тип]',
        ],
        rawSource: source,
      }),
    ])
  })

  it('учитывает базовое смещение диапазонов', () => {
    const [block] = parseContentSource('Текст', 17)

    expect(block.sourceRange).toEqual({
      end: 22,
      start: 17,
    })
    expect(block.rawSource).toBe('Текст')
  })

  it('разбирает inline-форматирование и сохраняет незнакомые символы', () => {
    const nodes = parseContentInline(
      'До **жирного** *курсива* <u>подчёркнутого</u> [ссылки](/rules) [[roll:2d6+1]] @@ после',
    )

    expect(nodes.map((node) => node.kind)).toEqual([
      'text',
      'bold',
      'text',
      'italic',
      'text',
      'underline',
      'text',
      'link',
      'text',
      'roll',
      'text',
    ])
    expect(nodes.at(-1)).toMatchObject({
      kind: 'text',
      text: ' @@ после',
    })
    expect(nodes[1]).toMatchObject({
      children: [
        expect.objectContaining({
          kind: 'text',
          text: 'жирного',
        }),
      ],
      kind: 'bold',
      rawSource: '**жирного**',
    })
  })

  it('разбирает вложенные визуальные форматы нового редактора', () => {
    const [node] = parseContentInline(
      '<strong><em><u>важно</u></em></strong>',
    )

    expect(node).toMatchObject({
      kind: 'bold',
      children: [
        {
          kind: 'italic',
          children: [
            {
              kind: 'underline',
              children: [
                expect.objectContaining({
                  kind: 'text',
                  text: 'важно',
                }),
              ],
            },
          ],
        },
      ],
    })
  })

  it.each([
    ['https://example.com/path', 'https://example.com/path'],
    ['mailto:hero@example.com', 'mailto:hero@example.com'],
    ['/encyclopedia/races', '/encyclopedia/races'],
    ['#features', '#features'],
    [' javascript:alert(1) ', null],
    ['data:text/html,test', null],
    ['//example.com', null],
    ['/\\example.com', null],
    ['relative/path', null],
    ['https://example.com\njavascript:alert(1)', null],
  ])('проверяет безопасную ссылку %s', (source, expected) => {
    expect(safeContentLinkTarget(source)).toBe(expected)
  })
})
