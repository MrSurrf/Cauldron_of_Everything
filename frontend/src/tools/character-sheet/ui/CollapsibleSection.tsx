import {
  createElement,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import {
  IconButton,
  TextInput,
  Tooltip,
} from '../../../shared/ui'
import {
  ArrowIcon,
  ChevronIcon,
  RemoveIcon,
} from './icons'
import styles from './sections.module.css'
import sectionStyles from './SheetSection/SheetSection.module.css'
import { useControllableBoolean } from './useControllableBoolean'

export type CollapsibleSectionProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'title'
> & {
  actions?: ReactNode
  actionsPlacement?: 'edge' | 'title'
  children: ReactNode
  collapsible?: boolean
  contentLayout?: 'default' | 'editor'
  defaultOpen?: boolean
  editableTitle?: boolean
  headingLevel?: 2 | 3 | 4 | 5 | 6
  moveDownDisabled?: boolean
  moveUpDisabled?: boolean
  onMoveDown?: () => void
  onMoveUp?: () => void
  onOpenChange?: (open: boolean) => void
  onRemove?: () => void
  onTitleChange?: (title: string) => void
  open?: boolean
  title: string
}

export function CollapsibleSection({
  actions,
  actionsPlacement = 'edge',
  children,
  className,
  collapsible = true,
  contentLayout = 'default',
  defaultOpen = true,
  editableTitle = false,
  headingLevel = 3,
  moveDownDisabled = false,
  moveUpDisabled = false,
  onMoveDown,
  onMoveUp,
  onOpenChange,
  onRemove,
  onTitleChange,
  open,
  title,
  ...sectionProps
}: CollapsibleSectionProps) {
  const generatedId = useId()
  const contentId = `sheet-section-${generatedId}`
  const headingId = `${contentId}-heading`
  const [isOpen, setOpen] = useControllableBoolean({
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    value: open,
  })
  const contentVisible = collapsible ? isOpen : true
  const headingTag = `h${headingLevel}`
  const sectionClassName = [
    styles.section,
    contentLayout === 'editor' ? sectionStyles.editorSection : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      {...sectionProps}
      aria-labelledby={headingId}
      className={sectionClassName}
      data-collapsible={collapsible}
      data-actions-placement={actionsPlacement}
      data-content-layout={contentLayout}
      data-open={contentVisible}
    >
      <header className={styles.header}>
        {collapsible && (
          <Tooltip
            content={`${isOpen ? 'Свернуть' : 'Развернуть'} секцию «${title}»`}
          >
            <IconButton
              aria-controls={contentId}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Свернуть' : 'Развернуть'} секцию «${title}»`}
              className={styles.toggle}
              icon={<ChevronIcon />}
              size="sm"
              variant="secondary"
              onClick={() => setOpen(!isOpen)}
            />
          </Tooltip>
        )}

        <div className={styles.titleWrap}>
          {editableTitle && onTitleChange ? (
            <>
              {createElement(
                headingTag,
                {
                  id: headingId,
                  className: styles.srOnly,
                },
                title,
              )}
              <label
                className={styles.srOnly}
                htmlFor={`${contentId}-title`}
              >
                Название секции
              </label>
              <TextInput
                id={`${contentId}-title`}
                aria-label="Название секции"
                className={styles.compactControl}
                rootClassName={styles.compactFrame}
                value={title}
                onChange={(event) => {
                  onTitleChange(event.currentTarget.value)
                }}
              />
            </>
          ) : (
            createElement(
              headingTag,
              {
                id: headingId,
                className: styles.title,
              },
              title,
            )
          )}
        </div>

        <div className={styles.actions}>
          {actions}

          {onMoveUp && (
            <Tooltip content={`Переместить секцию «${title}» выше`}>
              <IconButton
                aria-label={`Переместить секцию «${title}» выше`}
                disabled={moveUpDisabled}
                icon={<ArrowIcon direction="up" />}
                size="sm"
                variant="secondary"
                onClick={onMoveUp}
              />
            </Tooltip>
          )}

          {onMoveDown && (
            <Tooltip content={`Переместить секцию «${title}» ниже`}>
              <IconButton
                aria-label={`Переместить секцию «${title}» ниже`}
                disabled={moveDownDisabled}
                icon={<ArrowIcon direction="down" />}
                size="sm"
                variant="secondary"
                onClick={onMoveDown}
              />
            </Tooltip>
          )}

          {onRemove && (
            <Tooltip content={`Удалить секцию «${title}»`}>
              <IconButton
                aria-label={`Удалить секцию «${title}»`}
                icon={<RemoveIcon />}
                size="sm"
                variant="secondary"
                onClick={onRemove}
              />
            </Tooltip>
          )}
        </div>
      </header>

      {contentVisible && (
        <div
          id={contentId}
          className={styles.content}
        >
          {children}
        </div>
      )}
    </section>
  )
}
