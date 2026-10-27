import { useId, useMemo, useRef, useState } from 'react'
import {
  captureCampaignWikiImageRepository,
  getCampaignWikiImageAccountScope,
} from '../../local'
import type {
  CampaignWikiImageKind,
  CampaignWikiImageRepository,
} from '../../local'
import { useCampaignWikiImage } from './useCampaignWikiImage'
import styles from './CampaignWikiImageField.module.css'

export type CampaignWikiImageFieldProps = {
  assetId?: string | null
  kind: CampaignWikiImageKind
  onAssetIdChange: (assetId: string | null) => void | Promise<void>
  alt?: string
  label?: string
  className?: string
  disabled?: boolean
  editable?: boolean
  repository?: CampaignWikiImageRepository
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function CampaignWikiImageField({
  assetId,
  kind,
  onAssetIdChange,
  alt = '',
  label = kind === 'cover' ? 'Обложка' : 'Портрет',
  className,
  disabled = false,
  editable = true,
  repository: providedRepository,
}: CampaignWikiImageFieldProps) {
  const defaultScope = getCampaignWikiImageAccountScope()
  const repository = useMemo(
    () => providedRepository ?? captureCampaignWikiImageRepository(defaultScope),
    [defaultScope, providedRepository],
  )
  const image = useCampaignWikiImage(assetId, repository)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const blocked = disabled || pending

  async function upload(file: File | undefined) {
    if (!file || blocked || !editable) return
    setPending(true)
    setMessage(null)
    let createdId: string | undefined
    try {
      const asset = await repository.save(file, {
        kind,
        assetId: assetId?.trim() || undefined,
      })
      if (!assetId) createdId = asset.id
      await onAssetIdChange(asset.id)
    } catch (cause: unknown) {
      if (createdId) await repository.remove(createdId).catch(() => undefined)
      setMessage(cause instanceof Error ? cause.message : 'Не удалось сохранить изображение.')
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove() {
    if (!assetId || blocked || !editable) return
    setPending(true)
    setMessage(null)
    try {
      await repository.remove(assetId)
      await onAssetIdChange(null)
    } catch (cause: unknown) {
      setMessage(cause instanceof Error ? cause.message : 'Не удалось удалить изображение.')
    } finally {
      setPending(false)
    }
  }

  const error = message ?? image.error
  const choose = () => {
    if (!blocked && editable) inputRef.current?.click()
  }

  return (
    <section
      className={classes(styles.field, className)}
      data-campaign-wiki-image={kind}
      aria-busy={pending || image.loading || undefined}
      onDragOver={(event) => {
        if (blocked || !editable) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(event) => {
        if (blocked || !editable) return
        event.preventDefault()
        void upload(event.dataTransfer.files[0])
      }}
    >
      <span className={styles.label}>{label}</span>
      <div className={styles.preview} data-kind={kind}>
        {image.src && (
          <img
            className={styles.image}
            src={image.src}
            alt={alt}
            draggable={false}
          />
        )}

        {!image.src && (
          <div className={styles.placeholder} role={image.loading ? 'status' : undefined}>
            {image.loading ? 'Открываем изображение…' : assetId ? 'Изображение не найдено' : `Добавить ${kind === 'cover' ? 'обложку' : 'портрет'}`}
          </div>
        )}

        {editable && (
          <div className={styles.actions}>
            <button className={styles.action} type="button" disabled={blocked} onClick={choose}>
              {pending ? 'Обработка…' : assetId ? 'Заменить' : 'Загрузить'}
            </button>
            {assetId && (
              <button className={classes(styles.action, styles.remove)} type="button" disabled={blocked} onClick={() => { void remove() }}>
                Удалить
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className={styles.input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={blocked || !editable}
        aria-label={`Загрузить: ${label}`}
        onChange={event => { void upload(event.currentTarget.files?.[0]) }}
      />
      <span className={styles.hint}>JPEG, PNG или WebP · до 15 МБ</span>
      {error && <span className={styles.error} role="alert">{error}</span>}
    </section>
  )
}

