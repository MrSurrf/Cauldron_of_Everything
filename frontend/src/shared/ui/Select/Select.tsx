import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { resolvePortalContainer } from '../Overlay/portal'
import { useAnchoredPosition } from '../Overlay/useAnchoredPosition'
import { setRef } from '../internal/react'
import styles from './Select.module.css'

export type SelectOption = { value: string; label: string; disabled?: boolean }
export type SelectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'value' | 'onChange'> & {
  value: string | null
  options: readonly SelectOption[]
  onValueChange: (value: string) => void
  label?: ReactNode
  placeholder?: string
  rootClassName?: string
  readOnly?: boolean
}

/** Выбор из короткого фиксированного списка без редактируемой строки поиска. */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select({
  value, options, onValueChange, label, placeholder = 'Выберите…', rootClassName,
  className, disabled = false, readOnly = false, name, id, onKeyDown, ...props
}, forwardedRef) {
  const generatedId = useId()
  const controlId = id ?? `select-${generatedId}`
  const listId = `${controlId}-list`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [triggerNode, setTriggerNode] = useState<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const query = useRef({ value: '', time: 0 })
  const selected = options.findIndex(option => option.value === value)
  const expanded = open && !disabled && !readOnly
  const position = useAnchoredPosition({ anchorRef: triggerRef, overlayRef: popupRef, open: expanded, matchAnchorWidth: true, offset: 5 })
  const portal = resolvePortalContainer(triggerNode)
  const attachTrigger = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node; setTriggerNode(node); setRef(forwardedRef, node)
  }, [forwardedRef])
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0)

  useEffect(() => {
    if (!expanded || !triggerNode) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !triggerNode.contains(event.target) && !popupRef.current?.contains(event.target)) setOpen(false)
    }
    triggerNode.ownerDocument.addEventListener('pointerdown', dismiss)
    return () => triggerNode.ownerDocument.removeEventListener('pointerdown', dismiss)
  }, [expanded, triggerNode])
  useLayoutEffect(() => {
    if (expanded && active >= 0) popupRef.current?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [expanded, active])

  function choose(index: number) {
    const option = options[index]
    if (!option || option.disabled || disabled || readOnly) return
    if (option.value !== value) onValueChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }
  function show(last = false) {
    if (disabled || readOnly) return
    setActive(selected >= 0 && !options[selected].disabled ? selected : enabled[last ? enabled.length - 1 : 0] ?? -1)
    query.current = { value: '', time: 0 }
    setOpen(true)
  }
  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || disabled || readOnly) return
    if (event.key === 'Tab') { setOpen(false); return }
    if (event.key === 'Escape') {
      if (expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false) }
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      if (!expanded) {
        show(event.key === 'ArrowUp' || event.key === 'End')
        if (event.key === 'Home' || event.key === 'End') setActive((event.key === 'Home' ? enabled[0] : enabled.at(-1)) ?? -1)
        return
      }
      const current = enabled.indexOf(active)
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)
        : enabled[(current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]
      setActive(next ?? -1)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (expanded) choose(active); else show()
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const now = Date.now()
      const letter = event.key.toLocaleLowerCase('ru-RU')
      const previous = now - query.current.time < 700 ? query.current.value : ''
      const nextQuery = previous === letter ? letter : previous + letter
      query.current = { value: nextQuery, time: now }
      const start = expanded ? active : selected
      const ordered = [...enabled.filter(index => index > start), ...enabled.filter(index => index <= start)]
      const match = ordered.find(index => options[index].label.toLocaleLowerCase('ru-RU').startsWith(nextQuery))
      if (match !== undefined) { if (expanded) setActive(match); else choose(match) }
    }
  }
  return <div className={[styles.root, rootClassName].filter(Boolean).join(' ')}>
    {label && <label className={styles.label} htmlFor={controlId}>{label}</label>}
    <button {...props} id={controlId} ref={attachTrigger} type="button" role="combobox" disabled={disabled}
      aria-readonly={readOnly || undefined} aria-expanded={expanded} aria-haspopup="listbox"
      aria-controls={expanded ? listId : undefined} aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
      className={[styles.trigger, className].filter(Boolean).join(' ')} onKeyDown={handleKey}
      onClick={event => { props.onClick?.(event); if (!event.defaultPrevented) { if (expanded) setOpen(false); else show() } }}>
      <span data-placeholder={selected < 0}>{options[selected]?.label ?? placeholder}</span>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
    {expanded && portal && createPortal(<div ref={popupRef} id={listId} role="listbox" aria-label={typeof label === 'string' ? label : props['aria-label']}
      className={styles.popup} style={position.style} onPointerDown={event => event.preventDefault()}>
      {options.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined} data-option-index={index} data-active={index === active} className={styles.option}
        onPointerMove={() => { if (!option.disabled) setActive(index) }} onClick={() => choose(index)}>
        <span>{option.label}</span><span className={styles.check} aria-hidden="true">{option.value === value ? '✓' : ''}</span>
      </div>)}
      {!options.length && <div className={styles.empty}>Нет вариантов</div>}
    </div>, portal)}
  </div>
})
