import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import { Button, ScrollArea, Select, TextArea, TextInput } from '../../../shared/ui'
import { captureImageAssetRepository, DEFAULT_IMAGE_EDITS } from '../model'
import type { ArticleImage } from '../model'
import { getArticleImageDimensions, normalizeArticleCrop, renderArticleImage, validateArticleImageFile } from './articleImageProcessing'
import type { ArticleImageDimensions } from './articleImageProcessing'
import styles from './ArticleImages.module.css'

type ArticleImagesProps = {
  images: ArticleImage[]
  coverImageId: string | null
  onChange: (images: ArticleImage[]) => void
  onCoverChange: (id: string | null) => void
  onInsert: (image: ArticleImage) => void
  usedImageIds?: string[]
}

/** Небольшие копии не используют полноразмерный canvas; временные URL освобождаются при замене. */
export function ArticlePhoto({ image, className, maxSize = 1200 }: {
  image: ArticleImage
  className?: string
  maxSize?: number
}) {
  const [result, setResult] = useState<{ key: string; scope: string; assetId: string; url?: string; error?: string } | null>(null)
  const repository = captureImageAssetRepository()
  const renderKey = JSON.stringify([repository.scope, image.assetId, image.edits, maxSize])

  useEffect(() => {
    let cancelled = false
    let url: string | undefined
    // Объединяем частые движения ползунка, сохраняя предыдущий кадр до готовности следующего.
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
      cancelled = true
      window.clearTimeout(timer)
      if (url) URL.revokeObjectURL(url)
    }
  // Метаданные alt/caption не требуют повторной обработки canvas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey])

  if (result?.error && result.key === renderKey) return <span className={`${styles.photoMessage} ${className ?? ''}`} role="status" data-article-image-error="">{result.error}</span>
  if (!result?.url || result.scope !== repository.scope || result.assetId !== image.assetId) return <span className={`${styles.photoMessage} ${className ?? ''}`} role="status" data-article-image-loading="">Загрузка фотографии…</span>
  return <img className={className} src={result.url} alt={image.alt} data-article-image-photo={image.id} aria-busy={result.key !== renderKey || undefined} />
}

const cropOptions = [
  { value: 'original', label: 'Оригинал' },
  { value: '16:9', label: '16:9 — широкий кадр' },
  { value: '4:3', label: '4:3 — классический' },
  { value: '1:1', label: '1:1 — квадрат' },
  { value: '9:16', label: '9:16 — вертикальный кадр' },
  { value: '3:4', label: '3:4 — портретный' },
  { value: 'custom', label: 'Произвольный кадр', disabled: true },
]

function freshEdits(): ArticleImage['edits'] {
  return { ...DEFAULT_IMAGE_EDITS, crop: { ...DEFAULT_IMAGE_EDITS.crop } }
}

function fullCrop(dimensions: ArticleImageDimensions, rotation: number, ratio: number) {
  const naturalRatio = rotation === 90 || rotation === 270 ? dimensions.height / dimensions.width : dimensions.width / dimensions.height
  const width = Math.min(1, ratio / naturalRatio)
  const height = Math.min(1, naturalRatio / ratio)
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height }
}

function currentRatio(image: ArticleImage, dimensions: ArticleImageDimensions | null) {
  const crop = image.edits.crop
  if (Math.abs(crop.x) < 0.000001 && Math.abs(crop.y) < 0.000001 && Math.abs(crop.width - 1) < 0.000001 && Math.abs(crop.height - 1) < 0.000001) return 'original'
  if (!dimensions) return 'custom'
  const rotated = image.edits.rotation === 90 || image.edits.rotation === 270
  const naturalRatio = rotated ? dimensions.height / dimensions.width : dimensions.width / dimensions.height
  const ratio = naturalRatio * image.edits.crop.width / image.edits.crop.height
  return ['16:9', '4:3', '1:1', '9:16', '3:4'].find(value => {
    const [width, height] = value.split(':').map(Number)
    return Math.abs(ratio - width / height) < 0.015
  }) ?? 'custom'
}

function ImageRange({ label, value, min = 0, max = 200, onChange, disabled = false }: {
  label: string; value: number; min?: number; max?: number; onChange: (value: number) => void; disabled?: boolean
}) {
  return <label className={styles.range}>
    <span>{label}<output>{Math.round(value)}%</output></span>
    <input type="range" aria-label={label} min={min} max={max} step={1} value={Math.round(value)} disabled={disabled}
      onChange={event => onChange(Number(event.target.value))} />
  </label>
}

export function ArticleImages({ images, coverImageId, onChange, onCoverChange, onInsert, usedImageIds = [] }: ArticleImagesProps) {
  const [assetRepository] = useState(captureImageAssetRepository)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [dimensions, setDimensions] = useState<{ assetId: string; size: ArticleImageDimensions } | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const latest = useRef({ images, coverImageId, onChange, onCoverChange })
  useLayoutEffect(() => { latest.current = { images, coverImageId, onChange, onCoverChange } }, [images, coverImageId, onChange, onCoverChange])
  const selected = images.find(image => image.id === selectedId) ?? images.find(image => image.id === coverImageId) ?? images[0]
  const selectedAssetId = selected?.assetId
  const size = dimensions && selected && dimensions.assetId === selected.assetId ? dimensions.size : null

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!selectedAssetId) return
    let cancelled = false
    void getArticleImageDimensions(selectedAssetId, assetRepository).then(next => {
      if (!cancelled) setDimensions({ assetId: selectedAssetId, size: next })
    }).catch(() => { /* ArticlePhoto показывает ошибку отсутствующего оригинала. */ })
    return () => { cancelled = true }
  }, [selectedAssetId, assetRepository])

  function updateImage(patch: Partial<ArticleImage>) {
    if (!selected) return
    onChange(images.map(image => image.id === selected.id ? { ...image, ...patch } : image))
  }

  function updateEdits(patch: Partial<ArticleImage['edits']>) {
    if (selected) updateImage({ edits: { ...selected.edits, ...patch } })
  }

  async function selectFiles(event: ChangeEvent<HTMLInputElement>, replace: boolean) {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (!files.length || busy) return
    const replacingId = replace ? selected?.id : undefined
    setBusy(true)
    setNotice('')
    const added: ArticleImage[] = []
    const errors: string[] = []
    try {
      for (const file of files) {
        try {
          await validateArticleImageFile(file)
          if (!mounted.current) return
          const assetId = crypto.randomUUID()
          await assetRepository.save(assetId, file)
          if (!mounted.current) return
          const previous = replacingId ? latest.current.images.find(image => image.id === replacingId) : undefined
          if (replace && !previous) continue
          added.push({ id: previous?.id ?? crypto.randomUUID(), assetId, name: file.name,
            alt: previous?.alt ?? '', caption: previous?.caption ?? '', edits: freshEdits() })
        } catch (cause: unknown) {
          errors.push(`${file.name}: ${cause instanceof Error ? cause.message : 'Не удалось сохранить фотографию.'}`)
        }
      }
      if (!mounted.current) return
      if (added.length) {
        const current = latest.current
        current.onChange(replacingId
          ? current.images.map(image => image.id === replacingId ? added[0] : image)
          : [...current.images, ...added])
        if (!current.coverImageId && !replacingId) current.onCoverChange(added[0].id)
        setSelectedId(added[0].id)
      }
      setNotice(errors.join(' '))
    } finally { if (mounted.current) setBusy(false) }
  }

  function selectCrop(value: string | null) {
    if (!selected || !size || !value || value === 'custom') return
    if (value === 'original') { updateEdits({ crop: { x: 0, y: 0, width: 1, height: 1 } }); return }
    const [width, height] = value.split(':').map(Number)
    updateEdits({ crop: fullCrop(size, selected.edits.rotation, width / height) })
  }

  function scaleCrop(percent: number) {
    if (!selected) return
    const crop = normalizeArticleCrop(selected.edits.crop)
    const maxWidth = Math.min(1, crop.width / crop.height)
    const maxHeight = Math.min(1, crop.height / crop.width)
    const width = maxWidth * percent / 100
    const height = maxHeight * percent / 100
    updateEdits({ crop: normalizeArticleCrop({ width, height, x: crop.x + (crop.width - width) / 2, y: crop.y + (crop.height - height) / 2 }) })
  }

  function rotate() {
    if (!selected) return
    const crop = selected.edits.crop
    updateEdits({ rotation: ((selected.edits.rotation + 90) % 360) as ArticleImage['edits']['rotation'],
      crop: normalizeArticleCrop({ x: 1 - crop.y - crop.height, y: crop.x, width: crop.height, height: crop.width }) })
  }

  function removeSelected() {
    if (!selected || usedImageIds.includes(selected.id)) return
    const remaining = images.filter(image => image.id !== selected.id)
    onChange(remaining)
    if (coverImageId === selected.id) onCoverChange(remaining[0]?.id ?? null)
    setSelectedId(remaining[0]?.id ?? null)
    setNotice('')
  }

  const crop = selected ? normalizeArticleCrop(selected.edits.crop) : null
  const cropScale = crop ? Math.max(crop.width, crop.height) * 100 : 100
  const used = Boolean(selected && usedImageIds.includes(selected.id))
  const ratio = selected ? currentRatio(selected, size) : 'original'

  return <aside className={styles.panel} aria-labelledby="article-images-heading" data-article-images="">
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Медиатека статьи</span><h2 id="article-images-heading">Изображения</h2></div>
      <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={busy} onClick={() => uploadRef.current?.click()}
        data-article-image-upload="">{busy ? 'Загрузка…' : '+ Добавить'}</Button>
    </header>
    <input ref={uploadRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple
      aria-label="Загрузить фотографии статьи" onChange={event => { void selectFiles(event, false) }} data-article-image-file="" />
    <input ref={replaceRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp"
      aria-label="Заменить выбранную фотографию" onChange={event => { void selectFiles(event, true) }} data-article-image-replace-file="" />

    <ScrollArea rootClassName={styles.scroll} contentClassName={styles.content} aria-label="Редактирование фотографий статьи">
      {notice && <p className={styles.error} role="alert">{notice}</p>}
      {!selected ? <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">▧</span>
        <h3>Добавьте первую фотографию</h3>
        <p>Обложка и изображения для текста будут здесь. JPEG, PNG или WebP, до 20 МБ каждое.</p>
        <Button size="md" variant="secondary" decoration="minimal" icon={null} disabled={busy} onClick={() => uploadRef.current?.click()}>Выбрать фотографии</Button>
      </div> : <>
        <div className={styles.selectedHeading}><span>{selected.id === coverImageId ? 'Обложка статьи' : 'Выбранное изображение'}</span><small>{images.findIndex(image => image.id === selected.id) + 1} / {images.length}</small></div>
        <div className={styles.preview} data-article-image-selected={selected.id}>
          <ArticlePhoto image={selected} className={styles.previewPhoto} maxSize={720} />
          <span className={styles.ratioBadge} aria-hidden="true">{ratio === 'original' ? 'Оригинал' : ratio === 'custom' ? 'Произвольный' : ratio}</span>
        </div>
        <div className={styles.quickActions}>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={!size} onClick={rotate} data-article-image-rotate=""><span className={styles.actionLabel}><span aria-hidden="true">↻</span>Повернуть</span></Button>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} onClick={() => updateEdits(freshEdits())} data-article-image-reset=""><span className={styles.actionLabel}><span aria-hidden="true">↺</span>Сбросить</span></Button>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={busy} onClick={() => replaceRef.current?.click()} data-article-image-replace=""><span className={styles.actionLabel}><span aria-hidden="true">↑</span>Заменить</span></Button>
        </div>
        <section className={styles.group} aria-labelledby="article-image-crop-heading">
          <h3 id="article-image-crop-heading">Кадрирование</h3>
          <Select aria-label="Пропорции кадра" value={ratio} options={cropOptions} disabled={!size} onValueChange={selectCrop} />
          {crop && <div className={styles.adjustments}>
            <ImageRange label="Размер кадра" min={20} max={100} value={cropScale} disabled={!size} onChange={scaleCrop} />
            <ImageRange label="Положение по горизонтали" max={100} value={crop.width < 0.999 ? crop.x / (1 - crop.width) * 100 : 50}
              disabled={!size || crop.width >= 0.999} onChange={value => updateEdits({ crop: { ...crop, x: (1 - crop.width) * value / 100 } })} />
            <ImageRange label="Положение по вертикали" max={100} value={crop.height < 0.999 ? crop.y / (1 - crop.height) * 100 : 50}
              disabled={!size || crop.height >= 0.999} onChange={value => updateEdits({ crop: { ...crop, y: (1 - crop.height) * value / 100 } })} />
          </div>}
        </section>
        <section className={styles.group} aria-labelledby="article-image-color-heading">
          <h3 id="article-image-color-heading">Цвет и свет</h3>
          <div className={styles.adjustments}>
            <ImageRange label="Яркость" value={selected.edits.brightness} onChange={brightness => updateEdits({ brightness })} />
            <ImageRange label="Насыщенность" value={selected.edits.saturation} onChange={saturation => updateEdits({ saturation })} />
            <ImageRange label="Контраст" value={selected.edits.contrast} onChange={contrast => updateEdits({ contrast })} />
          </div>
        </section>
        <section className={styles.group} aria-labelledby="article-image-text-heading">
          <h3 id="article-image-text-heading">Подписи к изображению</h3>
          <TextInput label="Alt-текст" placeholder="Что изображено на фотографии" value={selected.alt} maxLength={500}
            onChange={event => updateImage({ alt: event.target.value })} hint="Описание для тех, кто не видит изображение." />
          <TextArea label="Подпись (необязательно)" rows={3} value={selected.caption} maxLength={1000}
            onChange={event => updateImage({ caption: event.target.value })} />
        </section>
        <div className={styles.insertActions}>
          <Button size="md" variant="secondary" decoration="minimal" icon={null} fullWidth onClick={() => onInsert(selected)} data-article-image-insert="">Вставить в текст</Button>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={selected.id === coverImageId}
            onClick={() => onCoverChange(selected.id)} data-article-image-cover="">{selected.id === coverImageId ? '✓ Обложка статьи' : 'Сделать обложкой'}</Button>
        </div>
        <section className={styles.group} aria-labelledby="article-image-library-heading">
          <div className={styles.libraryHeading}><h3 id="article-image-library-heading">Все изображения</h3><span>{images.length}</span></div>
          <div className={styles.thumbnails}>
            {images.map(image => <button key={image.id} type="button" className={styles.thumbnail} aria-label={`Редактировать фотографию: ${image.name}`}
              aria-pressed={image.id === selected.id} onClick={() => { setSelectedId(image.id); setNotice('') }} data-article-image-thumbnail={image.id}>
              <ArticlePhoto image={image} className={styles.thumbnailPhoto} maxSize={180} />
              {image.id === coverImageId && <span className={styles.coverMark}>Обложка</span>}
            </button>)}
          </div>
          <div className={styles.removeRow}>
            <span title={selected.name}>{selected.name}</span>
            <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={used || busy} onClick={removeSelected}
              title={used ? 'Сначала удалите фотографию из текста статьи.' : 'Удалить фотографию из статьи'} data-article-image-delete="">Удалить</Button>
          </div>
          {used && <p className={styles.hint}>Фотография вставлена в текст. Чтобы удалить её из медиатеки, сначала уберите её из статьи.</p>}
        </section>
        <p className={styles.hint}>Оригиналы сохраняются без изменений. Обработка применяется к копии фотографии.</p>
      </>}
    </ScrollArea>
  </aside>
}
