import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import { RemoveIcon } from '../icons'
import styles from './CharacterPortrait.module.css'

export type CharacterPortraitProps = {
  characterName?: string
  disabled?: boolean
  onFileSelect?: (file: File) => void
  onRemove?: () => void
  portraitUrl: string | null
}

function PentagramPlaceholder() {
  return (
    <svg
      className={styles.pentagram}
      data-testid="character-portrait-placeholder"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path d="M50 4 55 23 50 30 45 23Z" />
      <path d="M50 96 45 77 50 70 55 77Z" />
      <path d="M4 50 23 45 30 50 23 55Z" />
      <path d="M96 50 77 55 70 50 77 45Z" />
      <circle cx="50" cy="50" r="31" />
      <circle cx="50" cy="50" r="23" />
      <polygon points="50,19 57,41 80,41 61,55 69,77 50,64 31,77 39,55 20,41 43,41" />
      <path d="m50 19 11 36-30 22 26-36 12 36-30-22 41-14H20l41 14Z" />
      <circle cx="50" cy="50" r="3" />
    </svg>
  )
}

export function CharacterPortrait({
  characterName = '',
  disabled = false,
  onFileSelect,
  onRemove,
  portraitUrl,
}: CharacterPortraitProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const previousPortraitUrlRef = useRef(portraitUrl)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const displayedUrl = previewUrl ?? portraitUrl
  const portraitAlt = characterName.trim()
    ? `Портрет персонажа ${characterName.trim()}`
    : 'Портрет персонажа'

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (previousPortraitUrlRef.current === portraitUrl) return

    previousPortraitUrlRef.current = portraitUrl
    if (!previewUrlRef.current) return

    URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setPreviewUrl(null)
  }, [portraitUrl])

  const releasePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file || !file.type.startsWith('image/')) return

    releasePreview()
    if (typeof URL.createObjectURL === 'function') {
      const nextPreviewUrl = URL.createObjectURL(file)
      previewUrlRef.current = nextPreviewUrl
      setPreviewUrl(nextPreviewUrl)
    }
    onFileSelect?.(file)
  }

  const handleRemove = () => {
    releasePreview()
    setPreviewUrl(null)
    onRemove?.()
  }

  return (
    <div
      className={styles.root}
      data-has-image={Boolean(displayedUrl) || undefined}
    >
      <input
        ref={inputRef}
        className={styles.fileInput}
        aria-label="Выбрать изображение персонажа"
        accept="image/*"
        disabled={disabled}
        tabIndex={-1}
        type="file"
        onChange={handleFileChange}
      />

      <button
        className={styles.picker}
        aria-label={
          displayedUrl
            ? 'Заменить изображение персонажа'
            : 'Загрузить изображение персонажа'
        }
        disabled={disabled}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        {displayedUrl ? (
          <img
            className={styles.image}
            src={displayedUrl}
            alt={portraitAlt}
          />
        ) : (
          <PentagramPlaceholder />
        )}
        <span className={styles.hint} aria-hidden="true">
          {displayedUrl ? 'Заменить' : 'Добавить портрет'}
        </span>
      </button>

      {displayedUrl &&
        !disabled &&
        (previewUrl !== null || onRemove) && (
          <button
            className={styles.remove}
            aria-label="Удалить изображение персонажа"
            title="Удалить изображение"
            type="button"
            onClick={handleRemove}
          >
            <RemoveIcon />
          </button>
        )}

      <span className={styles.innerFrame} aria-hidden="true" />
      <span className={styles.cornerOrnament} aria-hidden="true" />
    </div>
  )
}
