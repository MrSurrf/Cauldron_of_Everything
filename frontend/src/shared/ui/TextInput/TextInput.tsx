import { forwardRef } from 'react'

import { isAriaInvalid } from '../TextField/aria'
import { TextFieldFrame } from '../TextField/TextFieldFrame'
import styles from '../TextField/TextFieldFrame.module.css'
import type { TextInputProps } from './TextInput.types'

export const TextInput = forwardRef<
  HTMLInputElement,
  TextInputProps
>(function TextInput(
  {
    'aria-invalid': ariaInvalid,
    className,
    disabled = false,
    icon,
    placeholder = 'Ваш текст...',
    rootClassName,
    type = 'text',
    ...inputProps
  },
  ref,
) {
  const inputClassName = [
    styles.control,
    styles.singleLine,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <TextFieldFrame
      disabled={disabled}
      icon={icon}
      invalid={isAriaInvalid(ariaInvalid)}
      rootClassName={rootClassName}
    >
      <input
        {...inputProps}
        ref={ref}
        aria-invalid={ariaInvalid}
        className={inputClassName}
        type={type}
        disabled={disabled}
        placeholder={placeholder}
      />
    </TextFieldFrame>
  )
})
