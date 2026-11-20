import {
  Button,
  Popover,
  TextArea,
} from '../../../../shared/ui'
import type {
  CustomField,
  CustomSection,
} from '../../model/characterSheet.types'
import type { ComputedValueResult } from '../fields'
import { PlusIcon } from '../icons'
import { CollapsibleSection } from '../CollapsibleSection'
import { CustomFieldRenderer } from './CustomFieldRenderer'
import styles from './CustomSections.module.css'

export type NewCustomBlockKind =
  | 'text'
  | 'number'
  | 'computed'
  | 'list'
  | 'table'
  | 'collapsible'

export type CustomSectionsProps = {
  fields: Readonly<Record<string, CustomField>>
  getFormulaResult: (
    field: CustomField,
  ) => ComputedValueResult
  getVariableKeyError: (fieldId: string) => string | undefined
  onAddBlock: (kind: NewCustomBlockKind) => void
  onFieldChange: (field: CustomField) => void
  onFieldRemove: (fieldId: string) => void
  onSectionChange: (
    id: string,
    patch: Partial<CustomSection>,
  ) => void
  onSectionMove: (id: string, direction: -1 | 1) => void
  onSectionRemove: (id: string) => void
  sections: readonly CustomSection[]
}

const blockKinds: ReadonlyArray<{
  kind: NewCustomBlockKind
  label: string
}> = [
  { kind: 'text', label: 'Текстовый блок' },
  { kind: 'number', label: 'Числовое поле' },
  { kind: 'computed', label: 'Вычисляемое поле' },
  { kind: 'list', label: 'Список' },
  { kind: 'table', label: 'Таблица' },
  { kind: 'collapsible', label: 'Выпадающая секция' },
]

export function CustomSections({
  fields,
  getFormulaResult,
  getVariableKeyError,
  onAddBlock,
  onFieldChange,
  onFieldRemove,
  onSectionChange,
  onSectionMove,
  onSectionRemove,
  sections,
}: CustomSectionsProps) {
  return (
    <div className={styles.sections}>
      <div className={styles.heading}>
        <h2>Пользовательские секции</h2>

        <Popover
          content={(
            <div className={styles.addMenu}>
              {blockKinds.map((block) => (
                <Button
                  key={block.kind}
                  icon={<PlusIcon />}
                  size="sm"
                  variant="secondary"
                  onClick={() => onAddBlock(block.kind)}
                >
                  {block.label}
                </Button>
              ))}
            </div>
          )}
          placement="bottom"
        >
          <Button
            icon={<PlusIcon />}
            size="sm"
            variant="secondary"
          >
            Добавить блок
          </Button>
        </Popover>
      </div>

      {sections.length === 0 && (
        <p className={styles.empty}>
          Пользовательских секций пока нет.
        </p>
      )}

      {sections.map((section, index) => (
        <CollapsibleSection
          key={section.id}
          editableTitle={true}
          moveDownDisabled={index === sections.length - 1}
          moveUpDisabled={index === 0}
          open={section.expanded}
          title={section.title}
          onMoveDown={() => onSectionMove(section.id, 1)}
          onMoveUp={() => onSectionMove(section.id, -1)}
          onOpenChange={(expanded) => {
            onSectionChange(section.id, { expanded })
          }}
          onRemove={
            section.removable
              ? () => onSectionRemove(section.id)
              : undefined
          }
          onTitleChange={(title) => {
            onSectionChange(section.id, { title })
          }}
        >
          {(section.kind === 'text' ||
            section.kind === 'collapsible') && (
            <TextArea
              aria-label={`Содержимое секции «${section.title}»`}
              placeholder="Ваш текст..."
              rows={4}
              value={section.text}
              onChange={(event) => {
                onSectionChange(section.id, {
                  text: event.currentTarget.value,
                })
              }}
            />
          )}

          {section.fieldIds.length > 0 && (
            <div className={styles.fields}>
              {section.fieldIds.map((fieldId) => {
                const field = fields[fieldId]
                if (!field) return null

                return (
                  <CustomFieldRenderer
                    key={field.id}
                    formulaResult={getFormulaResult(field)}
                    variableKeyError={getVariableKeyError(field.id)}
                    value={field}
                    onChange={onFieldChange}
                    onRemove={() => onFieldRemove(field.id)}
                  />
                )
              })}
            </div>
          )}
        </CollapsibleSection>
      ))}
    </div>
  )
}
