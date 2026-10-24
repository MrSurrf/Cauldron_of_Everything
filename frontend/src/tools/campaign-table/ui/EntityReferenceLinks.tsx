import { useState } from 'react'
import type { ReactNode } from 'react'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { entryReference } from '../model/library'
import type { LibraryReference } from '../model/library'

/** Внутренние ссылки карточек открываются в том же рабочем пространстве. */
export function EntityReferenceLinks({ children, readOnly = false, onOpen }: {
  children: ReactNode; readOnly?: boolean; onOpen: (reference: LibraryReference) => void
}) {
  const [error, setError] = useState('')
  return <div onClickCapture={event => {
    const anchor = (event.target as HTMLElement).closest('a')
    const path = anchor?.getAttribute('href')
    if (!path?.startsWith('/encyclopedia/')) return
    event.preventDefault(); event.stopPropagation()
    if (readOnly) return
    const [, , type, slug] = path.split('/')
    const controller = new AbortController()
    const request = type === 'entry'
      ? fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(slug)}/`, controller.signal)
      : fetchEncyclopedia<{ results: EncyclopediaEntry[] }>(`?${new URLSearchParams({ type, slug: decodeURIComponent(slug ?? ''), page_size: '1' })}`, controller.signal).then(list => list.results[0])
    void request.then(entry => { if (entry) { setError(''); onOpen(entryReference(entry)) } else setError('Связанный материал недоступен.') })
      .catch(() => setError('Не удалось открыть связанный материал.'))
  }}>{error && <p role="alert">{error}</p>}{children}</div>
}
