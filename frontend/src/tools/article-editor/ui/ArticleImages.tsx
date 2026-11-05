import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import { Button, ScrollArea, Select, TextArea, TextInput } from '../../../shared/ui'
import { captureImageAssetRepository, DEFAULT_IMAGE_EDITS } from '../model'
import type { ArticleImage } from '../model'
import { getArticleImageDimensions, normalizeArticleCrop, validateArticleImageFile } from './articleImageProcessing'
import type { ArticleImageDimensions } from './articleImageProcessing'
import { ArticleCropFrame } from './ArticleCropFrame'
import { ArticlePhoto } from './ArticlePhoto'
import styles from './ArticleImages.module.css'

type ArticleImagesProps = {
  images: ArticleImage[]
  coverImageId: string | null
  onChange: (images: ArticleImage[]) => void
  onCoverChange: (id: string | null) => void
  onInsert: (image: ArticleImage) => void
  usedImageIds?: string[]
}

export { ArticlePhoto } from './ArticlePhoto'

const cropOptions = [
  { value: 'custom', label: 'Свободные пропорции' },
  { value: 'original', label: 'Исходные пропорции' },
  { value: '16:9', label: '16:9 — широкий кадр' },
  { value: '4:3', label: '4:3 — классический' },
  { value: '1:1', label: '1:1 — квадрат' },
  { value: '9:16', label: '9:16 — вертикальный кадр' },
  { value: '3:4', label: '3:4 — портретный' },
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
  const [cropEditing, setCropEditing] = useState(false)
  const [cropModes, setCropModes] = useState<Record<string, string>>({})
  const [dimensions, setDimensions] = useState<{ assetId: string; size: ArticleImageDimensions } | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const revealFrame = useRef(0)
  const mounted = useRef(true)
  const latest = useRef({ images, coverImageId, onChange, onCoverChange })
  useLayoutEffect(() => { latest.current = { images, coverImageId, onChange, onCoverChange } }, [images, coverImageId, onChange, onCoverChange])
  const selected = images.find(image => image.id === selectedId) ?? images.find(image => image.id === coverImageId) ?? images[0]
  const selectedAssetId = selected?.assetId
  const size = dimensions && selected && dimensions.assetId === selected.assetId ? dimensions.size : null
  const cropIdentity = selected ? `${selected.id}:${selected.assetId}:${selected.edits.rotation}` : ''
  // Геометрия сохранённого кадра не должна сама включать фиксацию пропорций.
  const ratio = cropModes[cropIdentity] ?? 'custom'
  const naturalRatio = size ? selected?.edits.rotation === 90 || selected?.edits.rotation === 270 ? size.height / size.width : size.width / size.height : 1
  const lockedRatio = ratio === 'custom' ? undefined : ratio === 'original' ? naturalRatio
    : Number(ratio.split(':')[0]) / Number(ratio.split(':')[1])

  function rememberCropMode(value: string, rotation = selected?.edits.rotation) {
    if (selected && rotation !== undefined) setCropModes(modes => ({ ...modes, [`${selected.id}:${selected.assetId}:${rotation}`]: value }))
  }

  function revealCrop() {
    setCropEditing(true)
    cancelAnimationFrame(revealFrame.current)
    revealFrame.current = requestAnimationFrame(() => previewRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }))
  }

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancelAnimationFrame(revealFrame.current) } }, [])
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
        setCropEditing(false)
        setSelectedId(added[0].id)
      }
      setNotice(errors.join(' '))
    } finally { if (mounted.current) setBusy(false) }
  }

  function selectCrop(value: string | null) {
    if (!selected || !size || !value) return
    rememberCropMode(value)
    revealCrop()
    if (value === 'custom') return
    if (value === 'original') { updateEdits({ crop: { x: 0, y: 0, width: 1, height: 1 } }); return }
    const [width, height] = value.split(':').map(Number)
    const fitted = fullCrop(size, selected.edits.rotation, width / height)
    const previous = normalizeArticleCrop(selected.edits.crop)
    updateEdits({ crop: normalizeArticleCrop({ ...fitted, x: previous.x + previous.width / 2 - fitted.width / 2, y: previous.y + previous.height / 2 - fitted.height / 2 }) })
  }

  function rotate() {
    if (!selected) return
    const crop = selected.edits.crop
    const rotation = ((selected.edits.rotation + 90) % 360) as ArticleImage['edits']['rotation']
    rememberCropMode(ratio.includes(':') ? ratio.split(':').reverse().join(':') : ratio, rotation)
    updateEdits({ rotation,
      crop: normalizeArticleCrop({ x: 1 - crop.y - crop.height, y: crop.x, width: crop.height, height: crop.width }) })
  }

  function removeSelected() {
    if (!selected || usedImageIds.includes(selected.id)) return
    const remaining = images.filter(image => image.id !== selected.id)
    onChange(remaining)
    if (coverImageId === selected.id) onCoverChange(remaining[0]?.id ?? null)
    setSelectedId(remaining[0]?.id ?? null)
    setCropEditing(false)
    setNotice('')
  }

  const used = Boolean(selected && usedImageIds.includes(selected.id))

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
        <div className={styles.preview} ref={previewRef} data-article-image-selected={selected.id}>
          {cropEditing && size ? <ArticleCropFrame key={`${selected.id}:${selected.assetId}:${selected.edits.rotation}:${ratio}`}
            image={selected} dimensions={size} aspectRatio={lockedRatio} onCropChange={crop => updateEdits({ crop })} />
            : <ArticlePhoto image={selected} className={styles.previewPhoto} maxSize={720} />}
          {!cropEditing && <span className={styles.ratioBadge} aria-hidden="true">{ratio === 'original' ? 'Исходные' : ratio === 'custom' ? 'Свободный кадр' : ratio}</span>}
        </div>
        <div className={styles.quickActions}>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={!size} aria-pressed={cropEditing}
            onClick={() => { if (cropEditing) setCropEditing(false); else { rememberCropMode(ratio); revealCrop() } }} data-article-image-crop-toggle=""><span className={styles.actionLabel}><span aria-hidden="true">⌗</span>{cropEditing ? 'Готово' : 'Обрезать'}</span></Button>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={!size} onClick={rotate} data-article-image-rotate=""><span className={styles.actionLabel}><span aria-hidden="true">↻</span>Повернуть</span></Button>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} onClick={() => {
            setCropModes(modes => Object.fromEntries(Object.entries(modes).filter(([key]) => !key.startsWith(`${selected.id}:`))))
            setCropEditing(false); updateEdits(freshEdits())
          }} data-article-image-reset=""><span className={styles.actionLabel}><span aria-hidden="true">↺</span>Сбросить</span></Button>
          <Button size="sm" variant="secondary" decoration="bare" icon={null} disabled={busy} onClick={() => replaceRef.current?.click()} data-article-image-replace=""><span className={styles.actionLabel}><span aria-hidden="true">↑</span>Заменить</span></Button>
        </div>
        <section className={styles.group} aria-labelledby="article-image-crop-heading">
          <h3 id="article-image-crop-heading">Кадрирование</h3>
          <Select aria-label="Пропорции кадра" value={ratio} options={cropOptions} disabled={!size} onValueChange={selectCrop} />
          <p className={styles.hint}>{cropEditing
            ? ratio === 'custom' ? 'Тяните углы или стороны свободно: ширина и высота независимы. «Готово» покажет результат.' : 'Пропорции зафиксированы. Для произвольной формы выберите «Свободные пропорции».'
            : 'Нажмите «Обрезать». По умолчанию рамка свободная; пропорции фиксируются только при выборе из списка.'}</p>
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
              aria-pressed={image.id === selected.id} onClick={() => { setSelectedId(image.id); setCropEditing(false); setNotice('') }} data-article-image-thumbnail={image.id}>
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
