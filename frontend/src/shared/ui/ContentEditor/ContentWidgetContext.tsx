import { createContext, useContext } from 'react'
import type { ContentEditorProps } from './ContentEditor.types'

export type ContentWidgetContextValue = Pick<ContentEditorProps,
  | 'disabled'
  | 'evaluateResourceMaximum'
  | 'inheritedVisibility'
  | 'onLinkActivate'
  | 'onStructuredResourceChange'
  | 'readOnly'
  | 'viewerAudience'
> & {
  dndEditorId?: string
  editorId?: string
}

export const ContentWidgetContext = createContext<ContentWidgetContextValue>({})
export const useContentWidgetContext = () => useContext(ContentWidgetContext)
