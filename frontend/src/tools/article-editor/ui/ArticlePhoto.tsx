import { useEffect, useState } from 'react'
import { captureImageAssetRepository } from '../model'
import type { ArticleImage } from '../model'
import { renderArticleImage } from './articleImageProcessing'
import styles from './ArticleImages.module.css'

/** Метаданные и движение рамки не требуют повторной обработки оригинала. */
export function ArticlePhoto({ image, className, maxSize = 1200 }: {
  image: ArticleImage; className?: string; maxSize?: number
}) {
  const [result, setResult] = useState<{ key: string; scope: string; assetId: string; url?: string; error?: string } | null>(null)
  const repository = captureImageAssetRepository()
  const renderKey = JSON.stringify([repository.scope, image.assetId, image.edits, maxSize])

  useEffect(() => {
    let cancelled = false
    let url: string | undefined
    const timer = window.setTimeout(() => {
      void renderArticleImage(image, maxSize, repository).then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setResult({ key: renderKey, scope: repository.scope, assetId: image.assetId, url })
      }).catch((cause: unknown) => {
        if (!cancelled) setResult({ key: renderKey, scope: repository.scope, assetId: image.assetId, error: cause instanceof Error ? cause.message : 'Не удалось открыть фотографию.' })
      })
    }, 60)
    return () => {
      cancelled = true; window.clearTimeout(timer)
      if (url) URL.revokeObjectURL(url)
    }
    // Идентичные настройки используют тот же renderKey, включая scope аккаунта.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey])

  if (result?.error && result.key === renderKey) return <span className={`${styles.photoMessage} ${className ?? ''}`} role="status" data-article-image-error="">{result.error}</span>
  if (!result?.url || result.scope !== repository.scope || result.assetId !== image.assetId) return <span className={`${styles.photoMessage} ${className ?? ''}`} role="status" data-article-image-loading="">Загрузка фотографии…</span>
  return <img className={className} src={result.url} alt={image.alt} draggable={false} data-article-image-photo={image.id} aria-busy={result.key !== renderKey || undefined} />
}
