import { describe, expect, it } from 'vitest'
import { createWikiDefaults, updateWiki, updateWikiProperty, updateWikiSection, validWiki } from './wiki'

describe('wiki Entity кампании', () => {
  it('создаёт независимые пустые значения', () => {
    const first = createWikiDefaults()
    const second = createWikiDefaults()
    first.aliases.push('Серый маг')
    first.media.coverAssetId = 'cover:1'
    expect(second).toEqual({
      aliases: [], status: '', tags: [], world: '', customProperties: [], sections: [], media: {},
    })
  })

  it('обновляет свойства и разделы без изменения исходного документа', () => {
    const original = updateWiki(createWikiDefaults(), {
      aliases: ['Лис'],
      customProperties: [{ id: 'home', label: 'Дом', value: 'Лес' }],
      sections: [{ id: 'secret', title: 'Тайна', content: 'Текст', visibility: 'master', collapsedByDefault: true }],
      media: { avatarAssetId: 'asset:portrait' },
    })
    const propertyChanged = updateWikiProperty(original, 'home', { value: 'Башня' })
    const sectionChanged = updateWikiSection(propertyChanged, 'secret', { visibility: 'players', collapsedByDefault: false })

    expect(original.customProperties[0].value).toBe('Лес')
    expect(original.sections[0]).toMatchObject({ visibility: 'master', collapsedByDefault: true })
    expect(sectionChanged.customProperties[0].value).toBe('Башня')
    expect(sectionChanged.sections[0]).toMatchObject({ visibility: 'players', collapsedByDefault: false })
    expect(sectionChanged.media.avatarAssetId).toBe('asset:portrait')
    expect(updateWikiProperty(original, 'missing', { value: 'x' })).toBe(original)
    expect(updateWikiSection(original, 'missing', { content: 'x' })).toBe(original)
  })

  it('валидирует видимость, уникальные ID и ссылки на загруженные медиа', () => {
    const valid = updateWiki(createWikiDefaults(), {
      status: 'Активен', tags: ['маг'], world: 'Мидденхейм',
      customProperties: [{ id: 'role', label: 'Роль', value: 'Советник' }],
      sections: [{ id: 'bio', title: 'История', content: '**Текст**', visibility: 'public', collapsedByDefault: false }],
      media: { coverAssetId: 'asset:cover', avatarAssetId: 'asset:avatar' },
    })
    expect(validWiki(valid)).toBe(true)
    expect(validWiki({ ...valid, sections: [...valid.sections, { ...valid.sections[0] }] })).toBe(false)
    expect(validWiki({ ...valid, customProperties: [...valid.customProperties, { ...valid.customProperties[0] }] })).toBe(false)
    expect(validWiki({ ...valid, sections: [{ ...valid.sections[0], visibility: 'secret' }] })).toBe(false)
    expect(validWiki({ ...valid, media: { coverAssetId: '' } })).toBe(false)
  })
})
