import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../Button'
import { Select } from '../Select'
import { ImageCropFrame } from './ImageCropFrame'
import { DEFAULT_CROP_FILE_SIZE, exportCroppedImage, initialImageCrop, loadCropImage } from './imageProcessing'
import type { LoadedCropImage } from './imageProcessing'
import type { CropRect } from './cropGeometry'
import styles from './ImageCropDialog.module.css'

export type ImageCropDialogProps = {
  file: File
  title?: string
  initialAspectRatio?: number
  maxFileSize?: number
  onConfirm: (file: File) => void
  onCancel: () => void
}

type CropState = { file: File; loaded: LoadedCropImage; crop: CropRect; aspectRatio?: number }
const proportions = [
  { value: 'free', label: 'Свободно' }, { value: '1', label: '1:1 — квадрат' },
  { value: '0.75', label: '3:4 — портрет' }, { value: `${4 / 3}`, label: '4:3 — альбом' },
]

export function ImageCropDialog({ file, title = 'Кадрирование изображения', initialAspectRatio, maxFileSize = DEFAULT_CROP_FILE_SIZE, onConfirm, onCancel }: ImageCropDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const generation = useRef(0)
  const titleId = useId()
  const descriptionId = useId()
  const [state, setState] = useState<CropState | null>(null)
  const [error, setError] = useState<{ file: File; message: string } | null>(null)
  const [savingFile, setSavingFile] = useState<File | null>(null)
  const current = state?.file === file ? state : null
  const saving = savingFile === file
  const message = error?.file === file ? error.message : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    const request = ++generation.current
    const controller = new AbortController()
    let loaded: LoadedCropImage | undefined
    void loadCropImage(file, maxFileSize, controller.signal).then(value => {
      if (request !== generation.current) { value.release(); return }
      loaded = value
      setState({ file, loaded: value, aspectRatio: initialAspectRatio,
        crop: initialImageCrop(value.image.naturalWidth, value.image.naturalHeight, initialAspectRatio) })
      setError(null)
    }).catch((cause: unknown) => {
      if (request !== generation.current || controller.signal.aborted) return
      setError({ file, message: cause instanceof Error ? cause.message : 'Не удалось открыть изображение.' })
    })
    return () => { generation.current = request + 1; controller.abort(); loaded?.release() }
  }, [file, initialAspectRatio, maxFileSize])

  function changeCrop(crop: CropRect) {
    setState(value => value?.file === file ? { ...value, crop } : value)
  }

  function chooseProportion(value: string) {
    if (!current) return
    const aspectRatio = value === 'free' ? undefined : Number(value)
    if (!aspectRatio) {
      setState({ ...current, aspectRatio: undefined })
      return
    }
    const inside = initialImageCrop(current.loaded.image.naturalWidth * current.crop.width, current.loaded.image.naturalHeight * current.crop.height, aspectRatio)
    setState({ ...current, aspectRatio, crop: {
      x: current.crop.x + inside.x * current.crop.width, y: current.crop.y + inside.y * current.crop.height,
      width: inside.width * current.crop.width, height: inside.height * current.crop.height,
    } })
  }

  async function apply() {
    if (!current || saving) return
    const request = generation.current
    setSavingFile(file); setError(null)
    try {
      const result = await exportCroppedImage(current.loaded.image, current.crop, file.name)
      if (request === generation.current) onConfirm(result)
    } catch (cause: unknown) {
      if (request === generation.current) setError({ file, message: cause instanceof Error ? cause.message : 'Не удалось сохранить кадрирование.' })
    } finally {
      if (request === generation.current) setSavingFile(null)
    }
  }

  if (typeof document === 'undefined') return null
  const ratioValue = current?.aspectRatio ? `${current.aspectRatio}` : 'free'
  const options = proportions.some(option => option.value === ratioValue) ? proportions : [...proportions, { value: ratioValue, label: 'Исходная пропорция' }]
  return createPortal(<dialog ref={dialogRef} className={styles.dialog} data-image-crop-dialog data-overlay-root
    aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onCancel() }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel()
    }}>
    <header className={styles.header}>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>Перемещайте рамку и тяните за её углы или границы, чтобы выбрать нужную область.</p>
    </header>
    <div className={styles.tools}>
      <Select aria-label="Пропорции кадра" options={options} value={ratioValue} disabled={!current || saving} onValueChange={chooseProportion} />
      <Button variant="secondary" decoration="minimal" size="sm" disabled={!current || saving}
        onClick={() => { if (current) changeCrop(initialImageCrop(current.loaded.image.naturalWidth, current.loaded.image.naturalHeight, current.aspectRatio)) }}>Сбросить</Button>
    </div>
    <div className={styles.preview} aria-busy={!current && !message || saving}>
      {current && <ImageCropFrame key={`${file.name}:${file.lastModified}:${current.loaded.url}`} crop={current.crop}
        dimensions={{ width: current.loaded.image.naturalWidth, height: current.loaded.image.naturalHeight }}
        onCropChange={changeCrop} aspectRatio={current.aspectRatio}>
        <img src={current.loaded.url} alt="Фотография для кадрирования" draggable={false} />
      </ImageCropFrame>}
      {!current && !message && <p role="status">Открываем изображение…</p>}
      {!current && message && <p>Выберите другое изображение и попробуйте ещё раз.</p>}
    </div>
    <p className={styles.error} role="alert">{message}</p>
    <footer className={styles.footer}>
      <Button variant="secondary" decoration="minimal" size="sm" onClick={onCancel}>Отмена</Button>
      <Button variant="primary" decoration="minimal" size="sm" icon={null} disabled={!current || saving} onClick={() => { void apply() }}>
        {saving ? 'Обработка…' : 'Применить'}
      </Button>
    </footer>
  </dialog>, document.body)
}
