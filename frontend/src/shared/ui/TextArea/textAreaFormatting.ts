import type { TextAreaFormatAction } from './TextArea.types'

export type TextAreaSelection = {
  end: number
  start: number
}

export type TextAreaFormatResult = {
  selection: TextAreaSelection
  value: string
}

type Wrap = {
  close: string
  open: string
  placeholder?: string
  selectPlaceholder?: boolean
}

function wrapSelection(
  value: string,
  selection: TextAreaSelection,
  {
    close,
    open,
    placeholder = '',
    selectPlaceholder = false,
  }: Wrap,
): TextAreaFormatResult {
  const selected = value.slice(
    selection.start,
    selection.end,
  )
  const content = selected || placeholder
  const nextValue =
    value.slice(0, selection.start) +
    open +
    content +
    close +
    value.slice(selection.end)
  const contentStart = selection.start + open.length

  return {
    selection: {
      start: contentStart,
      end:
        contentStart +
        (selectPlaceholder || selected
          ? content.length
          : 0),
    },
    value: nextValue,
  }
}

function prefixLines(
  value: string,
  selection: TextAreaSelection,
  prefix: (index: number) => string,
): TextAreaFormatResult {
  const lineStart = value.lastIndexOf(
    '\n',
    selection.start - 1,
  ) + 1
  const nextLineBreak = value.indexOf(
    '\n',
    selection.end,
  )
  const lineEnd =
    nextLineBreak === -1
      ? value.length
      : nextLineBreak
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const formatted = lines
    .map((line, index) => `${prefix(index)}${line}`)
    .join('\n')

  return {
    selection: {
      start: lineStart,
      end: lineStart + formatted.length,
    },
    value:
      value.slice(0, lineStart) +
      formatted +
      value.slice(lineEnd),
  }
}

export function formatTextAreaSelection(
  action: TextAreaFormatAction,
  value: string,
  selection: TextAreaSelection,
): TextAreaFormatResult {
  switch (action) {
    case 'bold':
      return wrapSelection(value, selection, {
        close: '**',
        open: '**',
      })
    case 'italic':
      return wrapSelection(value, selection, {
        close: '*',
        open: '*',
      })
    case 'underline':
      return wrapSelection(value, selection, {
        close: '</u>',
        open: '<u>',
      })
    case 'ordered-list':
      return prefixLines(
        value,
        selection,
        (index) => `${index + 1}. `,
      )
    case 'unordered-list':
      return prefixLines(
        value,
        selection,
        () => '- ',
      )
    case 'check-list':
      return prefixLines(
        value,
        selection,
        () => '- [ ] ',
      )
    case 'link': {
      const selected = value.slice(
        selection.start,
        selection.end,
      )
      const label = selected || 'ссылка'
      const url = 'https://'
      const replacement = `[${label}](${url})`
      const urlStart =
        selection.start + label.length + 3

      return {
        selection: {
          end: urlStart + url.length,
          start: urlStart,
        },
        value:
          value.slice(0, selection.start) +
          replacement +
          value.slice(selection.end),
      }
    }
    case 'roll':
      return wrapSelection(value, selection, {
        close: ']]',
        open: '[[roll:',
        placeholder: '1d20',
        selectPlaceholder: true,
      })
  }
}
