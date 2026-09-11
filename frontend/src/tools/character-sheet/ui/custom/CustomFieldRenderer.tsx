import {
  Button,
  IconButton,
  ScrollArea,
  TextInput,
  Tooltip,
} from '../../../../shared/ui'
import type {
  CustomField,
  CustomListField,
  CustomTableField,
} from '../../model/characterSheet.types'
import {
  FormulaField,
  type ComputedValueResult,
} from '../fields'
import sheetFieldStyles from '../fields/SheetFields.module.css'
import { PlusIcon, RemoveIcon } from '../icons'
import styles from './CustomSections.module.css'

export type CustomFieldRendererProps = {
  formulaResult?: ComputedValueResult
  onChange: (field: CustomField) => void
  onRemove: () => void
  value: CustomField
  variableKeyError?: string
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ListField({
  onChange,
  value,
}: {
  onChange: (field: CustomListField) => void
  value: CustomListField
}) {
  return (
    <div className={styles.listField}>
      {value.items.map((item, index) => (
        <div
          key={item.id}
          className={styles.listRow}
        >
          <TextInput
            aria-label={`${value.label}: строка ${index + 1}`}
            fieldClassName={sheetFieldStyles.compactField}
            placeholder="Значение..."
            rootClassName={sheetFieldStyles.compactFrame}
            value={item.value}
            onChange={(event) => {
              onChange({
                ...value,
                items: value.items.map((current) =>
                  current.id === item.id
                    ? {
                        ...current,
                        value: event.currentTarget.value,
                      }
                    : current,
                ),
              })
            }}
          />
          <Tooltip content="Удалить строку">
            <IconButton
              aria-label={`Удалить строку ${index + 1}`}
              icon={<RemoveIcon />}
              size="sm"
              variant="secondary"
              onClick={() => {
                onChange({
                  ...value,
                  items: value.items.filter(
                    (current) => current.id !== item.id,
                  ),
                })
              }}
            />
          </Tooltip>
        </div>
      ))}

      <Button
        icon={<PlusIcon />}
        size="sm"
        variant="secondary"
        onClick={() => {
          onChange({
            ...value,
            items: [
              ...value.items,
              { id: createId('list-item'), value: '' },
            ],
          })
        }}
      >
        Добавить строку
      </Button>
    </div>
  )
}

function TableField({
  onChange,
  value,
}: {
  onChange: (field: CustomTableField) => void
  value: CustomTableField
}) {
  return (
    <div className={styles.tableWrap}>
      <ScrollArea
        aria-label={`Таблица «${value.label}»`}
        contentClassName={styles.tableContent}
        orientation="horizontal"
      >
        <table className={styles.table}>
          <thead>
            <tr>
              {value.columns.map((column) => (
                <th key={column.id} scope="col">
                  <div className={styles.columnHeader}>
                    <TextInput
                      aria-label={`Название столбца «${column.label}»`}
                      fieldClassName={sheetFieldStyles.compactField}
                      rootClassName={sheetFieldStyles.compactFrame}
                      value={column.label}
                      onChange={(event) => {
                        onChange({
                          ...value,
                          columns: value.columns.map((current) =>
                            current.id === column.id
                              ? {
                                  ...current,
                                  label: event.currentTarget.value,
                                }
                              : current,
                          ),
                        })
                      }}
                    />
                    <Tooltip content={`Удалить столбец «${column.label}»`}>
                      <IconButton
                        aria-label={`Удалить столбец «${column.label}»`}
                        disabled={value.columns.length <= 1}
                        icon={<RemoveIcon />}
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onChange({
                            ...value,
                            columns: value.columns.filter(
                              (current) => current.id !== column.id,
                            ),
                            rows: value.rows.map((row) => ({
                              ...row,
                              cells: Object.fromEntries(
                                Object.entries(row.cells).filter(
                                  ([columnId]) => columnId !== column.id,
                                ),
                              ),
                            })),
                          })
                        }}
                      />
                    </Tooltip>
                  </div>
                </th>
              ))}
              <th scope="col">Действия</th>
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                {value.columns.map((column) => (
                  <td key={column.id}>
                    <TextInput
                      aria-label={`${column.label}, строка ${rowIndex + 1}`}
                      fieldClassName={sheetFieldStyles.compactField}
                      rootClassName={sheetFieldStyles.compactFrame}
                      value={row.cells[column.id] ?? ''}
                      onChange={(event) => {
                        onChange({
                          ...value,
                          rows: value.rows.map((current) =>
                            current.id === row.id
                              ? {
                                  ...current,
                                  cells: {
                                    ...current.cells,
                                    [column.id]: event.currentTarget.value,
                                  },
                                }
                              : current,
                          ),
                        })
                      }}
                    />
                  </td>
                ))}
                <td>
                  <Tooltip content="Удалить строку">
                    <IconButton
                      aria-label={`Удалить строку ${rowIndex + 1}`}
                      icon={<RemoveIcon />}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        onChange({
                          ...value,
                          rows: value.rows.filter(
                            (current) => current.id !== row.id,
                          ),
                        })
                      }}
                    />
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className={styles.tableActions}>
        <Button
          icon={<PlusIcon />}
          size="sm"
          variant="secondary"
          onClick={() => {
            onChange({
              ...value,
              rows: [
                ...value.rows,
                {
                  id: createId('table-row'),
                  cells: Object.fromEntries(
                    value.columns.map((column) => [column.id, '']),
                  ),
                },
              ],
            })
          }}
        >
          Добавить строку
        </Button>

        <Button
          icon={<PlusIcon />}
          size="sm"
          variant="secondary"
          onClick={() => {
            const columnId = createId('table-column')
            onChange({
              ...value,
              columns: [
                ...value.columns,
                {
                  id: columnId,
                  label: `Столбец ${value.columns.length + 1}`,
                },
              ],
              rows: value.rows.map((row) => ({
                ...row,
                cells: {
                  ...row.cells,
                  [columnId]: '',
                },
              })),
            })
          }}
        >
          Добавить столбец
        </Button>
      </div>
    </div>
  )
}

export function CustomFieldRenderer({
  formulaResult = { status: 'empty', value: null },
  onChange,
  onRemove,
  value,
  variableKeyError,
}: CustomFieldRendererProps) {
  const effectiveFormulaResult = variableKeyError
    ? { status: 'empty' as const, value: null }
    : formulaResult

  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <TextInput
          aria-label="Название пользовательского поля"
          fieldClassName={sheetFieldStyles.compactField}
          placeholder="Название поля"
          rootClassName={sheetFieldStyles.compactFrame}
          value={value.label}
          onChange={(event) => {
            onChange({
              ...value,
              label: event.currentTarget.value,
            })
          }}
        />

        <Tooltip content="Удалить поле">
          <IconButton
            aria-label={`Удалить поле «${value.label}»`}
            icon={<RemoveIcon />}
            size="sm"
            variant="secondary"
            onClick={onRemove}
          />
        </Tooltip>
      </div>

      {value.kind === 'text' && (
        <TextInput
          aria-label={value.label}
          fieldClassName={sheetFieldStyles.compactField}
          placeholder="Ваш текст..."
          rootClassName={sheetFieldStyles.compactFrame}
          value={value.value}
          onChange={(event) => {
            onChange({
              ...value,
              value: event.currentTarget.value,
            })
          }}
        />
      )}

      {(value.kind === 'number' ||
        value.kind === 'computed') && (
        <FormulaField
          label={value.label || 'Значение'}
          result={effectiveFormulaResult}
          value={value.value}
          onValueChange={(fieldValue) => {
            onChange({
              ...value,
              value: fieldValue,
            })
          }}
        />
      )}

      {(value.kind === 'computed' || value.kind === 'number') && (
        <TextInput
          aria-label={`Переменная поля «${value.label}»`}
          error={variableKeyError}
          fieldClassName={sheetFieldStyles.compactField}
          hint="Латинские буквы, цифры и подчёркивания"
          label="Ключ переменной"
          invalid={Boolean(variableKeyError)}
          rootClassName={sheetFieldStyles.compactFrame}
          value={value.variableKey}
          onChange={(event) => {
            onChange({
              ...value,
              variableKey: event.currentTarget.value
                .toUpperCase()
                .replace(/[^A-Z0-9_]/g, ''),
            })
          }}
        />
      )}

      {value.kind === 'list' && (
        <ListField
          value={value}
          onChange={onChange}
        />
      )}

      {value.kind === 'table' && (
        <TableField
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  )
}
