export type MarkdownCommand = 'heading' | 'bold' | 'italic' | 'strike' | 'underline' | 'list' | 'ordered' | 'quote' | 'link' | 'code'
export type EditorSelection = { start: number; end: number }

/** Возвращает исходный Markdown и выделение; команды не зависят от DOM. */
export function applyMarkdownCommand(value: string, selection: EditorSelection, command: MarkdownCommand) {
  const selected = value.slice(selection.start, selection.end)
  if (['heading', 'list', 'ordered', 'quote'].includes(command)) {
    const start = value.lastIndexOf('\n', selection.start - 1) + 1
    const endIndex = value.indexOf('\n', Math.max(selection.start, selection.end - 1))
    const end = endIndex < 0 ? value.length : endIndex
    const content = value.slice(start, end).split('\n').map((line, index) => {
      const prefix = command === 'heading' ? '## ' : command === 'list' ? '- ' : command === 'quote' ? '> ' : `${index + 1}. `
      return prefix + line
    }).join('\n')
    return { value: value.slice(0, start) + content + value.slice(end), selection: { start, end: start + content.length } }
  }
  if (command === 'link') {
    const label = selected || 'Текст ссылки'
    const content = `[${label}](https://)`
    const start = selection.start + label.length + 3
    return { value: value.slice(0, selection.start) + content + value.slice(selection.end), selection: { start, end: start + 8 } }
  }
  const [open, close] = command === 'bold' ? ['**', '**'] : command === 'italic' ? ['*', '*']
    : command === 'strike' ? ['~~', '~~'] : command === 'underline' ? ['<u>', '</u>'] : ['`', '`']
  const content = selected || 'текст'
  const start = selection.start + open.length
  return {
    value: value.slice(0, selection.start) + open + content + close + value.slice(selection.end),
    selection: { start, end: start + content.length },
  }
}

export function escapeMarkdownLabel(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]').replace(/\r?\n/g, ' ')
}
