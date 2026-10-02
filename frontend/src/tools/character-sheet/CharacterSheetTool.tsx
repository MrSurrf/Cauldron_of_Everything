import {
  CharacterSheetProvider,
  type CharacterSheetDocument,
} from './model'
import { CharacterSheetContent } from './ui/sheet/CharacterSheetContent'

export type CharacterSheetToolProps = {
  className?: string
  /** Уменьшать лист целиком под ширину host-панели, не меняя его раскладку. */
  fitWidth?: boolean
  document?: CharacterSheetDocument
  initialDocument?: CharacterSheetDocument
  onDocumentChange?: (
    document: CharacterSheetDocument,
  ) => void
  onPortraitFileSelect?: (
    file: File,
    characterId: string,
  ) => void
  onPortraitRemove?: (characterId: string) => void
}

export function CharacterSheetTool({
  className,
  fitWidth,
  document,
  initialDocument,
  onDocumentChange,
  onPortraitFileSelect,
  onPortraitRemove,
}: CharacterSheetToolProps) {
  return (
    <CharacterSheetProvider
      document={document}
      initialDocument={initialDocument}
      onDocumentChange={onDocumentChange}
    >
      <CharacterSheetContent
        className={className}
        fitWidth={fitWidth}
        onPortraitFileSelect={onPortraitFileSelect}
        onPortraitRemove={onPortraitRemove}
      />
    </CharacterSheetProvider>
  )
}
