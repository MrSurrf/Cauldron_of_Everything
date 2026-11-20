import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { $createParagraphNode, $getNodeByKey, $getRoot, HISTORY_PUSH_TAG, type NodeKey } from 'lexical'
import { useContentWidgetContext } from './ContentWidgetContext'

export function useContentWidgetSelection(nodeKey: NodeKey) {
  const [editor] = useLexicalComposerContext()
  const [selected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey)
  const { disabled, readOnly } = useContentWidgetContext()
  const locked = disabled || readOnly
  return {
    selected,
    locked,
    select: () => {
      if (locked) return
      clearSelection()
      setSelected(true)
    },
    remove: () => {
      if (locked) return
      editor.update(() => {
        $getNodeByKey(nodeKey)?.remove()
        if ($getRoot().getChildrenSize() === 0) $getRoot().append($createParagraphNode()).selectStart()
      }, { tag: HISTORY_PUSH_TAG, onUpdate: () => editor.focus() })
    },
  }
}
