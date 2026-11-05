import { Panel } from '../../shared/ui'
import { articleCategories } from './articleFixtures'
import type { ArticlePreview } from './articleFixtures'
import styles from './ArticlesPage.module.css'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
})

function categoryLabel(category: ArticlePreview['category']) {
  return articleCategories.find(item => item.id === category)?.label ?? ''
}

export function ArticleCard({ article, compact = false, featured = false, titleAs: Heading = 'h2' }: {
  article: ArticlePreview
  compact?: boolean
  featured?: boolean
  titleAs?: 'h2' | 'h3'
}) {
  const titleId = `article-title-${article.id}`

  return (
    <article className={styles.article} data-compact={compact || undefined} data-featured={featured || undefined} aria-labelledby={titleId}>
      <Panel className={styles.articlePanel} padding="none">
        <div className={styles.articleContent}>
          <div className={styles.cover} aria-hidden="true" />
          <div className={styles.articleCopy}>
            <span className={styles.categoryBadge}>{categoryLabel(article.category)}</span>
            <Heading id={titleId}>{article.title}</Heading>
            <p className={styles.description}>{article.description}</p>
            <footer className={styles.articleMeta}>
              <div className={styles.author}>
                <span>{article.author}</span>
                <time dateTime={article.publishedAt}>{dateFormatter.format(new Date(`${article.publishedAt}T00:00:00Z`))}</time>
              </div>
              <span className={styles.readingTime}>{article.readingMinutes} мин чтения</span>
            </footer>
          </div>
        </div>
      </Panel>
    </article>
  )
}
