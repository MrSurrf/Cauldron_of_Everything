import { useMemo } from 'react'
import { ImageCropFrame } from '../../../shared/ui/ImageCropper'
import type { ArticleImage } from '../model'
import { ArticlePhoto } from './ArticlePhoto'
import type { ArticleImageDimensions } from './articleImageProcessing'
import type { CropRect } from './cropGeometry'
import styles from './ArticleCropFrame.module.css'

/** Общая рамка сохраняет отредактированный предпросмотр и координаты повернутого фото статьи. */
export function ArticleCropFrame({ image, dimensions, onCropChange, aspectRatio }: {
  image: ArticleImage; dimensions: ArticleImageDimensions
  onCropChange: (crop: CropRect) => void; aspectRatio?: number
}) {
  const rotated = image.edits.rotation === 90 || image.edits.rotation === 270
  const naturalDimensions = rotated ? { width: dimensions.height, height: dimensions.width } : dimensions
  const fullImage = useMemo(() => ({ ...image, edits: { ...image.edits, crop: { x: 0, y: 0, width: 1, height: 1 } } }), [image])
  return <ImageCropFrame crop={image.edits.crop} dimensions={naturalDimensions}
    onCropChange={onCropChange} aspectRatio={aspectRatio} articleSelectors>
    <ArticlePhoto image={fullImage} className={styles.photo} maxSize={1200} />
  </ImageCropFrame>
}
