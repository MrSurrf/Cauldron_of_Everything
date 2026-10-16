import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type { CharacterSheetAction } from './characterSheet.actions'
import type { CharacterSheetDocument } from './characterSheet.types'
import { characterSheetReducer } from './characterSheet.reducer'
import { createEmptyCharacterSheet } from './defaults'
import {
  evaluateCharacterSheetFormulas,
} from './formulas/formulaEngine'
import { CharacterSheetContext } from './characterSheet.context'

export type CharacterSheetProviderProps = {
  children: ReactNode
  document?: CharacterSheetDocument
  initialDocument?: CharacterSheetDocument
  onDocumentChange?: (document: CharacterSheetDocument) => void
}

export function CharacterSheetProvider({
  children,
  document: controlledDocument,
  initialDocument,
  onDocumentChange,
}: CharacterSheetProviderProps) {
  const [localDocument, localDispatch] = useReducer(
    characterSheetReducer,
    initialDocument,
    (value) => value ?? createEmptyCharacterSheet(),
  )
  const controlled = controlledDocument !== undefined
  const document = controlledDocument ?? localDocument
  const previousLocalDocument = useRef(localDocument)
  const onDocumentChangeRef = useRef(onDocumentChange)
  const pendingControlledDocument = useRef(
    controlledDocument,
  )

  useEffect(() => {
    onDocumentChangeRef.current = onDocumentChange
  }, [onDocumentChange])

  useEffect(() => {
    pendingControlledDocument.current = controlledDocument
  }, [controlledDocument])

  const dispatch = useCallback(
    (action: CharacterSheetAction) => {
      if (controlled && controlledDocument) {
        const sourceDocument =
          pendingControlledDocument.current ??
          controlledDocument
        const nextDocument = characterSheetReducer(
          sourceDocument,
          action,
        )
        if (nextDocument !== sourceDocument) {
          pendingControlledDocument.current = nextDocument
          onDocumentChangeRef.current?.(nextDocument)
        }
        return
      }

      localDispatch(action)
    },
    [controlled, controlledDocument],
  )
  const formulas = useMemo(
    () => evaluateCharacterSheetFormulas(document),
    [document],
  )

  useEffect(() => {
    if (localDocument === previousLocalDocument.current) {
      return
    }

    previousLocalDocument.current = localDocument
    if (!controlled) {
      onDocumentChangeRef.current?.(localDocument)
    }
  }, [controlled, localDocument])

  const value = useMemo(
    () => ({ document, dispatch, formulas }),
    [document, dispatch, formulas],
  )

  return (
    <CharacterSheetContext.Provider value={value}>
      {children}
    </CharacterSheetContext.Provider>
  )
}
