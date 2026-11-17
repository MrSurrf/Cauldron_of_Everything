import { useMemo } from 'react'
import { RichContent } from '../../../shared/ui/RichContent'
import { splitCreatureSectionContent } from './creatureSectionPresentation'
import styles from './CreatureSectionContent.module.css'

/** Общее представление текста правил; исходные ссылки и сложная разметка сохраняются. */
export function CreatureSectionContent({ html }: { html: string }) {
  const blocks = useMemo(() => splitCreatureSectionContent(html), [html])

  return (
    <div className={styles.root}>
      {blocks.map((block, index) => block.type === 'content' ? (
        <RichContent className={styles.content} html={block.html} key={index} />
      ) : (
        <dl className={styles.spellGroups} key={index}>
          {block.groups.map((group, groupIndex) => (
            <div className={styles.spellGroup} key={groupIndex}>
              <dt><span className={styles.frequency}>{group.label}</span></dt>
              <dd>
                <RichContent className={`${styles.content} ${styles.spellList}`} html={group.html} />
              </dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  )
}
