import type { HTMLAttributes } from 'react'

import styles from './RichContent.module.css'

const allowedTags = new Set([
  'a',
  'blockquote',
  'br',
  'em',
  'h3',
  'h4',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
])

const unsafeBlockPattern =
  /<(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\/\1\s*>/gi

function sanitizeRichHtml(html: string) {
  return html
    .replace(unsafeBlockPattern, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi,
      (tag, tagName: string) => {
        const normalizedName = tagName.toLowerCase()

        if (!allowedTags.has(normalizedName)) {
          return ''
        }

        if (normalizedName === 'br') {
          return '<br>'
        }

        if (
          normalizedName === 'a' &&
          !tag.startsWith('</')
        ) {
          const hrefMatch = tag.match(
            /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
          )
          const href = (
            hrefMatch?.[1] ??
            hrefMatch?.[2] ??
            hrefMatch?.[3] ??
            ''
          ).trim()
          const safeHref = /^(?:https?:|mailto:|\/|#)/i
            .test(href)

          if (!safeHref) return '<a>'

          const escapedHref = href
            .replaceAll('&', '&amp;')
            .replaceAll('"', '&quot;')

          return /^https?:/i.test(href)
            ? `<a href="${escapedHref}" target="_blank" rel="noreferrer">`
            : `<a href="${escapedHref}">`
        }

        return tag.startsWith('</')
          ? `</${normalizedName}>`
          : `<${normalizedName}>`
      },
    )
}

export type RichContentProps =
  Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    html: string
  }

export function RichContent({
  className,
  html,
  ...divProps
}: RichContentProps) {
  const rootClassName = [
    styles.content,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      {...divProps}
      className={rootClassName}
      dangerouslySetInnerHTML={{
        __html: sanitizeRichHtml(html),
      }}
    />
  )
}
