import {
  CharacterSheetProvider,
  type CharacterSheetDocument,
} from './model'
import { CharacterSheetContent } from './ui/sheet/CharacterSheetContent'

export type CharacterSheetToolProps = {
  className?: string
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
        onPortraitFileSelect={onPortraitFileSelect}
        onPortraitRemove={onPortraitRemove}
      />
    </CharacterSheetProvider>
  )
}
