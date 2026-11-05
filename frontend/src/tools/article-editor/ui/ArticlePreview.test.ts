import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { createArticleDraft, DEFAULT_IMAGE_EDITS } from '../model'
import type { ArticleDraft } from '../model'
import { ArticlePreview } from './ArticlePreview'

const IMAGE_ID = '66aad005-ea48-4f20-999c-9c6c807788ff'

function render(markdown: string, patch: Partial<ArticleDraft> = {}) {
  return renderToStaticMarkup(createElement(ArticlePreview, { draft: {
    ...createArticleDraft(), title: 'Записки мастера', markdown, ...patch,
  } }))
}

describe('ArticlePreview', () => {
  it('показывает readonly GFM tasklist через общий Checkbox и сохраняет оба состояния', () => {
    const html = render('- [x] Подготовить карту\n- [ ] Выбрать героев')
    expect(html.match(/data-checkbox-root=/g)).toHaveLength(2)
    expect(html.match(/data-selection-marker=/g)).toHaveLength(2)
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html.match(/checked=""/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Выполненный пункт списка"')
    expect(html).toContain('aria-label="Невыполненный пункт списка"')
    expect(html).toContain('Подготовить карту')
    expect(html).toContain('Выбрать героев')
  })

  it('поддерживает Markdown, таблицы, цитаты, ссылки и точные токены подчёркивания', () => {
    const html = render('## Глава\n\n**Смело**, *тихо*, ~~было~~, <u>важно **очень**</u>.\n\n> Цитата\n\n| Имя | Роль |\n| --- | --- |\n| Эль | Маг |\n\n[Источник](https://example.com/book)')
    expect(html).toContain('<h2>Глава</h2>')
    expect(html).toContain('<strong>Смело</strong>')
    expect(html).toContain('<em>тихо</em>')
    expect(html).toContain('<del>было</del>')
    expect(html).toContain('<u>важно <strong>очень</strong></u>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<table>')
    expect(html).toContain('href="https://example.com/book" target="_blank" rel="noopener noreferrer"')
  })

  it('не исполняет raw HTML и не пропускает опасные URL даже с похожими внутренними протоколами', () => {
    const html = render('<script>alert(1)</script>\n\n<u onclick="alert(2)">Текст</u>\n\n[JS](javascript:alert%281%29)\n\n[SVG](data:image/svg+xml,test)\n\n[File](file:///secret)\n\n[Entity](entity:123/../../secret)\n\n![Img](article-image:../../secret)')
    expect(html).not.toMatch(/<script|onclick=|href="javascript:|href="data:|href="file:|href="entity:/)
    expect(html).not.toContain('<u onclick')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<u>Текст</u>')
  })

  it('не превращает экранированные теги или фрагменты кода в подчёркивание', () => {
    const html = render('`<u>код</u>`\n\n\\<u>не тег\\</u>\n\n<u>не закрыт')
    expect(html).toContain('<code>&lt;u&gt;код&lt;/u&gt;</code>')
    expect(html).not.toContain('<u>')
  })

  it('рисует карточку из локального snapshot без запроса к энциклопедии', () => {
    const entity = { id: 123, type: 'spell', slug: 'shield', name: 'Щит', nameEn: 'Shield', summary: { level: 1, school: 'Ограждение' } }
    const html = render('[Любой текст](entity:123)', { entities: [entity] })
    expect(html).toContain('href="/encyclopedia/entry/123"')
    expect(html).toContain('data-appearance="navigation"')
    expect(html).toContain('Щит')
    expect(html).toContain('1-й уровень')
    expect(html).not.toContain('Любой текст')
  })

  it('использует компактную ссылку, когда сущность вставлена внутри абзаца', () => {
    const html = render('Изучите [заклинание](entity:123) перед боем.', { entities: [{ id: 123, type: 'spell', slug: 'shield', name: 'Щит', nameEn: '', summary: {} }] })
    expect(html).toContain('href="/encyclopedia/entry/123"')
    expect(html).not.toContain('data-appearance="navigation"')
    expect(html).toContain('перед боем.')
  })

  it('показывает понятные placeholders для неизвестных карточек и изображений', () => {
    const html = render(`[Нет записи](entity:123)\n\n![Башня](article-image:${IMAGE_ID})\n\n![Remote](https://example.com/tracker.jpg)`)
    expect(html).toContain('Карточка сущности не найдена')
    expect(html).toContain('Изображение не найдено в этом черновике: Башня')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src="https://example.com/tracker.jpg"')
  })

  it('подключает локальную фотографию и подпись без невалидного figure внутри абзаца', () => {
    const html = render(`Перед ![Башня](article-image:${IMAGE_ID}) после.`, { images: [{
      id: IMAGE_ID, assetId: 'original', name: 'tower.jpg', alt: 'Башня', caption: 'Над рекой', edits: { ...DEFAULT_IMAGE_EDITS },
    }] })
    expect(html).toContain('data-article-image-loading')
    expect(html).toContain('Над рекой')
    expect(html).not.toContain('<figure')
    expect(html).toContain('после.')
  })

  it('показывает заголовок, описание и обложку, но не выдаёт черновик за публикацию', () => {
    const html = render('', { description: 'Приключение начинается.', coverImageId: IMAGE_ID, images: [{
      id: IMAGE_ID, assetId: 'original', name: 'tower.jpg', alt: '', caption: '', edits: { ...DEFAULT_IMAGE_EDITS },
    }] })
    expect(html).toContain('<h1>Записки мастера</h1>')
    expect(html).toContain('Приключение начинается.')
    expect(html).toContain('<figure')
    expect(html).toContain('Предпросмотр')
    expect(html).toContain('Переключитесь в Markdown')
  })
})
