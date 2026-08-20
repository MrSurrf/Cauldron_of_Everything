import {
  IconButton,
  TextInput,
  Tooltip,
} from '../../../../shared/ui'
import {
  createClientId,
  manualNumericField,
  resourceFormulaVariable,
} from '../../model'
import { CollapsibleSection } from '../CollapsibleSection'
import { FormulaField } from '../fields'
import sheetFieldStyles from '../fields/SheetFields.module.css'
import { PlusIcon, RemoveIcon } from '../icons'
import styles from '../../CharacterSheetTool.module.css'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type ResourcesEditorProps = {
  sheet: CharacterSheetViewModel
}

export function ResourcesEditor({
  sheet,
}: ResourcesEditorProps) {
  const {
    dispatch,
    document,
    isSectionOpen,
    resultFor,
    setSectionOpen,
    updateNumericField,
  } = sheet

  return (
    <CollapsibleSection
      actions={(
        <Tooltip content="Добавить ресурс">
          <IconButton
            aria-label="Добавить ресурс"
            icon={<PlusIcon />}
            size="sm"
            variant="secondary"
            onClick={() => {
              dispatch({
                type: 'resource/add',
                value: {
                  current: manualNumericField(1),
                  id: createClientId('resource'),
                  label: `Новый ресурс ${document.resources.length + 1}`,
                  maximum: manualNumericField(1),
                  recovery: 'manual',
                },
              })
            }}
          />
        </Tooltip>
      )}
      open={isSectionOpen('resources')}
      title="Ресурсы"
      onOpenChange={(open) => {
        setSectionOpen('resources', open)
      }}
    >
      <div className={styles.resources}>
        {document.resources.length === 0 && (
          <p className={styles.empty}>
            Ресурсов пока нет.
          </p>
        )}

        {document.resources.map((resource) => (
          <div
            key={resource.id}
            className={styles.resource}
          >
            <TextInput
              aria-label="Название ресурса"
              fieldClassName={sheetFieldStyles.compactField}
              rootClassName={sheetFieldStyles.compactFrame}
              value={resource.label}
              onChange={(event) => {
                dispatch({
                  type: 'resource/update',
                  id: resource.id,
                  patch: {
                    label: event.currentTarget.value,
                  },
                })
              }}
            />

            {(['current', 'maximum'] as const).map((field) => {
              const key = resourceFormulaVariable(resource.id, field)
              return (
                <FormulaField
                  key={field}
                  accessibleLabel={`${
                    field === 'current'
                      ? 'Текущее значение'
                      : 'Максимальное значение'
                  }: ${resource.label || 'ресурс без названия'}`}
                  label={field === 'current' ? 'Текущее' : 'Максимум'}
                  result={resultFor(key)}
                  value={resource[field]}
                  onValueChange={(value) => {
                    updateNumericField(
                      {
                        field,
                        kind: 'resource',
                        resourceId: resource.id,
                      },
                      value,
                    )
                  }}
                />
              )
            })}

            <Tooltip content="Удалить ресурс">
              <IconButton
                aria-label={`Удалить ресурс «${resource.label}»`}
                icon={<RemoveIcon />}
                size="sm"
                variant="secondary"
                onClick={() => {
                  dispatch({
                    type: 'resource/remove',
                    id: resource.id,
                  })
                }}
              />
            </Tooltip>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  )
}
