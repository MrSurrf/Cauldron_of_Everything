import { describe, expect, it } from 'vitest'
import { createEditor } from 'lexical'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import {
  ContentDirectiveNode,
  ContentDividerNode,
  ContentRollNode,
} from './ContentEditorNodes'
import {
  $exportContentSource,
  $importContentSource,
} from './contentSourceBridge'

function roundTrip(source: string) {
  const editor = createEditor({
    namespace: 'content-source-test',
    nodes: [
      HeadingNode,
      QuoteNode,
      LinkNode,
      ListNode,
      ListItemNode,
      ContentDirectiveNode,
      ContentDividerNode,
      ContentRollNode,
    ],
    onError(error) {
      throw error
    },
  })
  let exported = ''

  editor.update(
    () => {
      $importContentSource(source)
      exported = $exportContentSource()
    },
    { discrete: true },
  )

  return exported
}

describe('content source bridge', () => {
  it('скрывает legacy-разметку во внутреннем дереве и сохраняет смысл', () => {
    const source = [
      '### Тактика',
      'Используйте **щит**, *уклонение* и <u>манёвр</u>.',
      '',
      '- первый пункт',
      '- второй пункт',
      '',
      'Проверка: [[roll:1d20+4]] и [правила](/rules).',
    ].join('\n')

    expect(roundTrip(source)).toBe([
      '### Тактика',
      '',
      'Используйте <strong>щит</strong>, <em>уклонение</em> и <u>манёвр</u>.',
      '',
      '- первый пункт',
      '- второй пункт',
      '',
      'Проверка: [[roll:1d20+4]] и [правила](/rules).',
    ].join('\n'))
  })

  it('не теряет ресурс, раскрываемый раздел и разделитель', () => {
    const source = [
      ':::resource[Второе дыхание]{current=1 maximum=1 recovery=short}',
      'Восстановите [[roll:1d10+2]] хитов.',
      ':::',
      '',
      '---',
      '',
      ':::collapsible[Тактика]',
      'Держаться рядом с союзником.',
      ':::',
    ].join('\n')

    expect(roundTrip(source)).toBe(source)
  })

  it('сохраняет неизвестный пользовательский текст', () => {
    const source = 'Обычный текст с @@ и :::unknown[блоком]'
    expect(roundTrip(source)).toBe(source)
  })
})
