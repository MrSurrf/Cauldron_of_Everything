import { createElement, type InputHTMLAttributes, type OutputHTMLAttributes } from 'react'

import styles from './NumericValue.module.css'

type NumericValueProps = {
  framed?: boolean
} & (
  | ({ as: 'input' } & InputHTMLAttributes<HTMLInputElement>)
  | ({ as: 'output' } & OutputHTMLAttributes<HTMLOutputElement>)
)

// Единственный владелец рамки и типографики чисел, независимо от режима поля.
export function NumericValue({ as, framed = true, className, ...props }: NumericValueProps) {

  return (
    <span
      className={styles.frame}
      data-numeric-frame
      data-framed={framed}
    >
      {createElement(as, {
        ...props,
        className: [styles.value, className].filter(Boolean).join(' '),
      })}
    </span>
  )
}
