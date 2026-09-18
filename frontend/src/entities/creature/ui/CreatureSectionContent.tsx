import { RichContent } from '../../../shared/ui/RichContent'
import { PlaceholderIcon } from '../../../shared/ui/icons/PlaceholderIcon'
import styles from './CreatureFullView.module.css'

export function CreatureSectionContent({ html }: { html: string }) {
  // Разбиваем только последовательность именованных абзацев статблока.
  // Произвольный HTML сохраняем целиком; очисткой по-прежнему занимается RichContent.
  const paragraphs = html.match(/<p\b[^>]*>[\s\S]*?<\/p\s*>/gi)
  const isNamedParagraphList = paragraphs?.length &&
    paragraphs.join('').replace(/\s/g, '') === html.replace(/\s/g, '') &&
    paragraphs.every((paragraph) => /^<p\b[^>]*>\s*<strong\b/i.test(paragraph))

  if (!isNamedParagraphList) {
    return <RichContent className={styles.sectionContent} html={html} />
  }

  return (
    <div className={styles.sectionEntries}>
      {paragraphs.map((paragraph, index) => (
        <div className={styles.sectionBody} key={index}>
          <span className={styles.sectionIcon} aria-hidden="true"><PlaceholderIcon /></span>
          <RichContent className={styles.sectionContent} html={paragraph} />
        </div>
      ))}
    </div>
  )
}
