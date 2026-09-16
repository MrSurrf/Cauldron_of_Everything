import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, type NodeKey } from 'lexical'
import { ResourceWidget } from './ResourceWidget'
import { resourceFromBlock, resourceToSource } from './resourceContent'
import { parseContentSource } from './contentCodec'
import { useContentWidgetContext } from './ContentWidgetContext'
import { ContentWidgetSelection } from './ContentWidgetSelection'
import { useContentWidgetSelection } from './useContentWidgetSelection'
import { $exportContentSource } from './contentSourceBridge'
import { $isContentDirectiveNode } from './ContentEditorNodes'

export function ContentResourceNode({ nodeKey, source }: { nodeKey: NodeKey; source: string }) {
  const [editor] = useLexicalComposerContext()
  const context = useContentWidgetContext()
  const { remove } = useContentWidgetSelection(nodeKey)
  const block = parseContentSource(source)[0]
  if (!block || block.kind !== 'resource') return null
  return (
    <ContentWidgetSelection nodeKey={nodeKey} label="ресурс" removeButton={false}>
      <ResourceWidget
        value={resourceFromBlock(block)}
        editorId={context.editorId}
        disabled={context.disabled}
        readOnly={context.readOnly}
        evaluateMaximum={context.evaluateResourceMaximum}
        onRemove={remove}
        onChange={(value) => {
          if (context.disabled || context.readOnly) return
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if (!$isContentDirectiveNode(node)) return
            node.setContent(value.title, resourceToSource(value, block.attributes))
          }, { onUpdate: () => {
            if (block.attributes.source && context.onStructuredResourceChange) {
              const nextSource = editor.getEditorState().read($exportContentSource)
              context.onStructuredResourceChange(block.attributes.source, value.current ?? 0, nextSource, value)
            }
          } })
        }}
      />
    </ContentWidgetSelection>
  )
}
