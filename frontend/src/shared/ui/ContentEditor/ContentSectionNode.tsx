import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, SKIP_DOM_SELECTION_TAG, SKIP_SELECTION_FOCUS_TAG, type NodeKey } from 'lexical'
import { SectionWidget } from './SectionWidget'
import { ItemWidget } from './ItemWidget'
import { itemFromBlock, itemToSource } from './itemContent'
import { sectionFromBlock, sectionToSource } from './sectionContent'
import { parseContentSource } from './contentCodec'
import { useContentWidgetContext } from './ContentWidgetContext'
import { ContentWidgetSelection } from './ContentWidgetSelection'
import { useContentWidgetSelection } from './useContentWidgetSelection'
import { $isContentDirectiveNode } from './ContentEditorNodes'
import { $exportContentSource } from './contentSourceBridge'

export function ContentSectionNode({ nodeKey, source }: { nodeKey: NodeKey; source: string }) {
  const [editor] = useLexicalComposerContext()
  const context = useContentWidgetContext()
  const { remove } = useContentWidgetSelection(nodeKey)
  const block = parseContentSource(source)[0]
  if (!block || (block.kind !== 'collapsible' && block.kind !== 'item')) return null
  function save(title: string, nextSource: string, onUpdate?: () => void) {
    if (context.disabled || context.readOnly) return
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isContentDirectiveNode(node)) node.setContent(title, nextSource)
    }, { onUpdate, tag: [SKIP_DOM_SELECTION_TAG, SKIP_SELECTION_FOCUS_TAG] })
  }
  const label = block.kind === 'item' ? 'предмет' : 'вкладку'
  return <ContentWidgetSelection
    nodeKey={nodeKey}
    label={label}
    removeButton={false}
    dragDescriptor={{
      editorId: context.dndEditorId,
      kind: block.kind,
      label,
      nodeKey,
      source,
    }}
  >
    {block.kind === 'item' ? <ItemWidget {...context} value={itemFromBlock(block)} onRemove={remove}
      onChange={next => save(next.title, itemToSource(next, block.attributes))} /> :
      <SectionWidget {...context} value={sectionFromBlock(block)} onRemove={remove}
        onChange={next => save(next.title, sectionToSource(next, block.attributes))}
        onStructuredResourceChange={context.onStructuredResourceChange ? (resourceSource, current, body, resource) => {
          const next = { ...sectionFromBlock(block), body }
          save(next.title, sectionToSource(next, block.attributes), () => {
            context.onStructuredResourceChange?.(resourceSource, current, editor.getEditorState().read($exportContentSource), resource)
          })
        } : undefined} />}
  </ContentWidgetSelection>
}
