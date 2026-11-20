import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import errorImage from '../../../assets/backgrounds/Error_page.png'
import styles from './ErrorPage.module.css'

type ErrorPageProps = {
  code: 404 | 503
  children?: ReactNode
}

export default function ErrorPage({ code, children }: ErrorPageProps) {
  return (
    <main className={styles.page} aria-labelledby="error-code" data-cursor-light-background="">
      <div className={styles.scene}>
        <img className={styles.illustration} src={errorImage} alt="" />
        <div className={styles.content}>
          <h1 id="error-code" className={styles.code}>{code}</h1>
          <p className={styles.description}>
            {code === 503 ? 'Сайт упал. Мы уже чиним!' : (
              <>
                Кажется что-то пошло не так!<br />
                <Link className={styles.homeLink} to="/">Вернитесь откуда пришли..</Link>
              </>
            )}
          </p>
          {children && <div className={styles.actions}>{children}</div>}
        </div>
      </div>
    </main>
  )
}
