import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Button, ListCard, Panel, PlaceholderIcon } from '../../shared/ui'
import { ArticleCard } from '../articles/ArticleCard'
import { articleFixtures } from '../articles/articleFixtures'
import styles from './HomePage.module.css'

const startingPoints = [
  { title: 'Создать персонажа', description: 'Продумай историю и способности своего героя.', to: '/tools/character-sheet' },
  { title: 'Вести кампанию', description: 'Собери заметки, сцены и идеи в одном месте.', to: '/my-table' },
  { title: 'Найти игроков', description: 'Скоро здесь можно будет найти компанию для игры.' },
  { title: 'Для клубов', description: 'Скоро появятся инструменты для сообществ.' },
] as const

const news = [
  { title: 'Открыта энциклопедия', description: 'Существа, заклинания и предметы для ваших приключений.', to: '/encyclopedia' },
  { title: 'Каталог статей', description: 'Гайды, разборы и идеи для игры.', to: '/articles' },
  { title: 'Лист персонажа', description: 'Создавайте и развивайте героев.', to: '/tools/character-sheet' },
] as const

const popularArticles = [...articleFixtures].sort((a, b) => b.popularity - a.popularity)

function QuickCard({ item }: { item: (typeof startingPoints)[number] }) {
  const content = <Panel className={styles.quickPanel} padding="normal">
    <span className={styles.quickIcon} aria-hidden="true"><PlaceholderIcon /></span>
    <span className={styles.quickCopy}>
      <strong>{item.title}</strong>
      <small>{item.description}</small>
    </span>
    {'to' in item
      ? <span className={styles.cardArrow} aria-hidden="true">→</span>
      : <span className={styles.soon}>Скоро</span>}
  </Panel>

  return 'to' in item
    ? <Link className={styles.quickLink} to={item.to}>{content}</Link>
    : <div className={styles.quickLink} aria-disabled="true">{content}</div>
}

export default function HomePage() {
  const navigate = useNavigate()

  if (window.location.hash === '#/gm') return <Navigate to="/survey#/gm" replace />

  return <main className={styles.page} data-cursor-light-background="">
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroContent}>
        <div className={styles.heroIntro}>
          <p className={styles.eyebrow}>Cauldron of Everything</p>
          <h1 id="home-title">Твой мир<br /><span>начинается здесь</span></h1>
          <span className={styles.titleDivider} aria-hidden="true" />
          <p className={styles.heroDescription}>Создавай кампании, играй, находи единомышленников и погружайся в мир НРИ вместе с нами.</p>
          <div className={styles.heroActions}>
            <Button size="md" onClick={() => navigate('/my-table')}>Создать кампанию</Button>
            <Button size="md" variant="secondary" icon={<PlaceholderIcon />} disabled title="Поиск игр скоро появится">Найти игру</Button>
          </div>
        </div>
        <Panel className={styles.heroNote} padding="normal">
          <p>Знания.<br />Инструменты.<br />Люди.<br /><span>Всё для твоих приключений.</span></p>
        </Panel>
      </div>
    </section>

    <div className={styles.container}>
      <section className={styles.workspace} aria-labelledby="workspace-title">
        <div className={styles.workspaceCopy}>
          <p className={styles.eyebrow}>Твоя мастерская</p>
          <h2 id="workspace-title">Весь твой мир<br />в одном месте</h2>
          <p>Удобные инструменты для игроков и мастеров. От идей и заметок до готовых кампаний и игровых сессий.</p>
          <Button size="md" onClick={() => navigate('/my-table')}>Узнать больше</Button>
        </div>
        <div className={styles.workspacePreview} aria-hidden="true">
          <div className={styles.previewToolbar}><span>Кампания</span><span>Мой стол</span><span>✦</span></div>
          <div className={styles.previewBody}>
            <div className={styles.previewNav}>
              <span>Локации</span><span>Персонажи</span><span>Заметки</span><span>Карты</span>
            </div>
            <div className={styles.previewCanvas}>
              <div className={styles.previewNode}><PlaceholderIcon /><span>Мир кампании</span></div>
              <div className={styles.previewNode}><PlaceholderIcon /><span>Приключения</span></div>
              <div className={styles.previewNode}><PlaceholderIcon /><span>Истории героев</span></div>
            </div>
            <div className={styles.previewDetails}>
              <span className={styles.previewAvatar}><PlaceholderIcon /></span>
              <strong>Твой персонаж</strong>
              <span>История, навыки и заметки</span>
              <i /><i /><i />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.start} aria-labelledby="start-title">
        <div className={styles.startIntro}>
          <h2 id="start-title">Выбери, с чего начать</h2>
          <p>Инструменты под разные задачи — для игроков, мастеров и организаторов.</p>
        </div>
        <div className={styles.quickGrid}>
          {startingPoints.map(item => <QuickCard key={item.title} item={item} />)}
        </div>
      </section>

      <div className={styles.editorial}>
        <section className={styles.editorialSection} aria-labelledby="news-title">
          <div className={styles.sectionHeading}>
            <h2 id="news-title">Последние новости</h2>
            <Link to="/articles">Все материалы <span aria-hidden="true">→</span></Link>
          </div>
          <div className={styles.editorialBody}>
            <Panel className={styles.newsFeature} padding="normal">
              <span className={styles.label}>Мастерская</span>
              <div>
                <h3>Мир приключений становится ближе</h3>
                <p>Исследуй энциклопедию, читай материалы сообщества и собирай идеи для своей следующей игры.</p>
                <Link to="/encyclopedia" className={styles.featureLink}>Открыть энциклопедию <span aria-hidden="true">→</span></Link>
              </div>
            </Panel>
            <div className={styles.editorialList}>
              {news.map(item => <Link to={item.to} className={styles.editorialLink} key={item.title}>
                <ListCard appearance="navigation" name={item.title} tags={[item.description]}
                  icon={<PlaceholderIcon />} />
              </Link>)}
            </div>
          </div>
        </section>

        <section className={styles.editorialSection} aria-labelledby="popular-title">
          <div className={styles.sectionHeading}>
            <h2 id="popular-title">Популярные статьи</h2>
            <Link to="/articles">Все статьи <span aria-hidden="true">→</span></Link>
          </div>
          <div className={styles.editorialBody}>
            <div className={styles.articleFeature}><ArticleCard article={popularArticles[0]} compact featured titleAs="h3" /></div>
            <div className={styles.editorialList}>
              {popularArticles.slice(1, 4).map(article => <div className={styles.editorialArticle} key={article.id}>
                <ListCard appearance="navigation" name={article.title}
                  tags={[`${article.readingMinutes} мин чтения`, article.author]}
                  icon={<PlaceholderIcon />} />
              </div>)}
            </div>
          </div>
        </section>
      </div>

      <section className={styles.friends} aria-labelledby="friends-title">
        <div className={styles.friendsIntro}>
          <h2 id="friends-title">Наши друзья</h2>
          <p>Здесь появятся партнёры, которые развивают культуру НРИ вместе с нами.</p>
        </div>
        <div className={styles.partnerSlots} aria-label="Места для партнёров">
          {[1, 2, 3, 4].map(number => <span key={number} className={styles.partnerSlot} aria-label={`Место для партнёра ${number}`}>
            <PlaceholderIcon />
          </span>)}
        </div>
        <Link className={styles.devLink} to="/dev">Мастерская</Link>
      </section>
    </div>
  </main>
}
