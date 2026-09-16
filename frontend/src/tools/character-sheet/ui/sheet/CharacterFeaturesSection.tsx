import {
  characterSheetActions,
  characterSheetReducer,
  createClientId,
  featureUseFormulaVariable,
  resourceFormulaVariable,
  type CharacterFeature,
  type CustomField,
  type CustomSection,
  type ResourcePool,
} from '../../model'
import { ContentEditor } from '../../../../shared/ui'
import { createResourceMaximumEvaluator, normalizeResourceMaximumExpression } from './resourceMaximumEvaluator'
import { SheetSection } from '../SheetSection'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterFeaturesSectionProps = {
  rows?: number
  sheet: CharacterSheetViewModel
}

const recoveryLabels: Readonly<
  Record<NonNullable<CharacterFeature['recovery']>, string>
> = {
  short: 'short',
  long: 'long',
  either: 'either',
  manual: 'custom',
}

function compactedFeature(
  features: readonly CharacterFeature[],
) {
  return features.find((feature) =>
    feature.id.startsWith('feature-notes-'),
  )
}

function directiveSource(header: string) {
  const source = header.match(
    /\bsource\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/i,
  )

  return source?.[1] ?? source?.[2] ?? source?.[3] ?? null
}

function replaceDirectiveNumber(
  header: string,
  attribute: 'current' | 'maximum',
  value: number,
) {
  const attributePattern = new RegExp(
    `(\\b${attribute}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s}]+)`,
    'i',
  )

  if (attributePattern.test(header)) {
    return header.replace(
      attributePattern,
      (_match, prefix: string) => `${prefix}${value}`,
    )
  }

  return header.replace(/}\s*$/, (closing) =>
    ` ${attribute}=${value}${closing}`,
  )
}

function synchronizeStructuredResources(
  value: string,
  features: readonly CharacterFeature[],
  resources: readonly ResourcePool[],
  valueFor: CharacterSheetViewModel['valueFor'],
) {
  return value.replace(
    /^:::resource\[[^\]\r\n]*\](?:\{[^}\r\n]*\})?\s*$/gim,
    (header) => {
      const source = directiveSource(header)
      if (!source) return header

      const separator = source.indexOf(':')
      if (separator <= 0 || separator === source.length - 1) {
        return header
      }

      const kind = source.slice(0, separator)
      const id = source.slice(separator + 1)
      let values: readonly [number | null, number | null]

      if (kind === 'resource') {
        if (!resources.some((resource) => resource.id === id)) {
          return header
        }

        values = [
          valueFor(resourceFormulaVariable(id, 'current')),
          valueFor(resourceFormulaVariable(id, 'maximum')),
        ]
      } else if (kind === 'feature') {
        if (!features.some((feature) => feature.id === id && feature.uses)) {
          return header
        }

        values = [
          valueFor(featureUseFormulaVariable(id, 'current')),
          valueFor(featureUseFormulaVariable(id, 'maximum')),
        ]
      } else {
        return header
      }

      const [current, maximum] = values

      return replaceDirectiveNumber(
        replaceDirectiveNumber(header, 'current', current ?? 0),
        'maximum',
        maximum ?? 0,
      )
    },
  )
}

function customFieldToText(field: CustomField) {
  switch (field.kind) {
    case 'text':
      return `**${field.label}:** ${field.value}`
    case 'number':
    case 'computed': {
      const value =
        field.value.mode === 'formula'
          ? field.value.formulaOverride ??
            field.value.manualValue ??
            ''
          : field.value.manualValue ?? ''

      return `**${field.label}:** ${value}`
    }
    case 'list':
      return `**${field.label}:** ${field.items
        .map((item) => item.value)
        .filter(Boolean)
        .join(', ')}`
    case 'table': {
      const headings = field.columns
        .map((column) => column.label)
        .join(' | ')
      const divider = field.columns
        .map(() => '---')
        .join(' | ')
      const rows = field.rows.map((row) =>
        field.columns
          .map((column) => row.cells[column.id] ?? '')
          .join(' | '),
      )

      return [
        `**${field.label}**`,
        `| ${headings} |`,
        `| ${divider} |`,
        ...rows.map((row) => `| ${row} |`),
      ].join('\n')
    }
  }
}

function customSectionsToText(
  sections: readonly CustomSection[],
  customFields: Readonly<Record<string, CustomField>>,
) {
  return sections
    .map((section) => {
      const fieldNotes = section.fieldIds
        .map((fieldId) => customFields[fieldId])
        .filter((field): field is CustomField => Boolean(field))
        .map(customFieldToText)
        .filter(Boolean)
        .join('\n')
      const body = [section.text, fieldNotes]
        .filter(Boolean)
        .join('\n')

      if (section.kind === 'collapsible') {
        return [
          `:::collapsible[${section.title}]`,
          body,
          ':::',
        ]
          .filter(Boolean)
          .join('\n')
      }

      return [
        `### ${section.title}`,
        body,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

function featuresToText(
  features: readonly CharacterFeature[],
  resources: readonly ResourcePool[],
  customFields: Readonly<Record<string, CustomField>>,
  customSections: readonly CustomSection[],
  valueFor: CharacterSheetViewModel['valueFor'],
) {
  const compacted = compactedFeature(features)
  if (compacted) {
    return synchronizeStructuredResources(
      compacted.description,
      features,
      resources,
      valueFor,
    )
  }

  const featureNotes = features
    .map((feature) => {
      const title = feature.title.trim() || 'Особенность'
      const description = feature.description
      const fieldNotes = feature.customFieldIds
        .map((fieldId) => customFields[fieldId])
        .filter((field): field is CustomField => Boolean(field))
        .map(customFieldToText)
        .filter(Boolean)
        .join('\n')
      const recoveryNote = feature.recoveryLabel.trim()
        ? `**Восстановление:** ${feature.recoveryLabel.trim()}`
        : ''
      const body = [
        description,
        recoveryNote,
        fieldNotes,
      ]
        .filter(Boolean)
        .join('\n')

      if (feature.uses) {
        const current = valueFor(
          featureUseFormulaVariable(feature.id, 'current'),
        )
        const maximum = valueFor(
          featureUseFormulaVariable(feature.id, 'maximum'),
        )
        const recovery = feature.recovery
          ? recoveryLabels[feature.recovery]
          : 'none'

        return [
          `:::resource[${title}]{current=${current ?? 0} maximum=${maximum ?? 0} recovery=${recovery} source=feature:${feature.id}}`,
          body,
          ':::',
        ]
          .filter(Boolean)
          .join('\n')
      }

      return [
        `### ${title}`,
        body,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
  const customNotes = customSectionsToText(
    customSections,
    customFields,
  )

  const resourceNotes = resources
    .map((resource) => {
      const current = valueFor(
        resourceFormulaVariable(resource.id, 'current'),
      )
      const maximum = valueFor(
        resourceFormulaVariable(resource.id, 'maximum'),
      )

      return [
        `:::resource[${resource.label}]{current=${current ?? 0} maximum=${maximum ?? 0} recovery=${recoveryLabels[resource.recovery]} source=resource:${resource.id}}`,
        ':::',
      ].join('\n')
    })
    .join('\n\n')

  return [resourceNotes, featureNotes, customNotes]
    .filter(Boolean)
    .join('\n\n')
}

export function CharacterFeaturesSection({
  rows = 10,
  sheet,
}: CharacterFeaturesSectionProps) {
  const {
    dispatch,
    document,
    valueFor,
  } = sheet
  const compacted = compactedFeature(document.features)

  function updateFeatures(value: string) {
    const compacted = compactedFeature(document.features)

    if (!compacted) {
      dispatch({
        type: 'feature/add',
        value: {
          category: 'other',
          customFieldIds: [],
          description: value,
          expanded: true,
          id: createClientId('feature-notes'),
          linkedEntityIds: [],
          recovery: null,
          recoveryLabel: '',
          title: '',
          uses: null,
        },
      })
      return
    }

    dispatch({
      type: 'feature/update',
      id: compacted.id,
      patch: { description: value },
    })
  }

  return (
    <SheetSection
      contentLayout="editor"
      title="Особенности, умения и заметки"
    >
      <ContentEditor
        evaluateResourceMaximum={createResourceMaximumEvaluator(sheet)}
        accessibleLabel="Особенности, умения и заметки"
        fill={true}
        renderPreview={true}
        placeholder="Особенности персонажа, способности и заметки..."
        rows={rows}
        showStructureActions={true}
        onStructuredResourceChange={(source, current, nextValue, widget) => {
          const separator = source.indexOf(':')
          if (separator <= 0 || separator === source.length - 1) {
            return
          }

          const kind = source.slice(0, separator)
          const id = source.slice(separator + 1)
          let nextDocument = document

          if (kind === 'resource') {
            const resource = document.resources.find(
              (entry) => entry.id === id,
            )
            if (!resource) return

            nextDocument = characterSheetReducer(
              nextDocument,
              characterSheetActions.setNumericField(
                {
                  field: 'current',
                  kind: 'resource',
                  resourceId: id,
                },
                {
                  ...resource.current,
                  manualValue: current,
                  mode: 'manual',
                },
              ),
            )
          } else if (kind === 'feature') {
            const feature = document.features.find(
              (entry) => entry.id === id,
            )
            if (!feature?.uses) return

            nextDocument = characterSheetReducer(
              nextDocument,
              characterSheetActions.setNumericField(
                {
                  featureId: id,
                  field: 'current',
                  kind: 'featureUse',
                },
                {
                  ...feature.uses.current,
                  manualValue: current,
                  mode: 'manual',
                },
              ),
            )
          } else {
            return
          }

          if (widget) {
            const numericMaximum = widget.maximum.trim() ? Number(widget.maximum) : null
            const maximum = Number.isFinite(numericMaximum) || numericMaximum === null
              ? { mode: 'manual' as const, manualValue: numericMaximum, formulaOverride: null }
              : { mode: 'formula' as const, manualValue: null, formulaOverride: normalizeResourceMaximumExpression(widget.maximum) }
            nextDocument = characterSheetReducer(nextDocument, characterSheetActions.setNumericField(
              kind === 'resource'
                ? { kind: 'resource', field: 'maximum', resourceId: id }
                : { kind: 'featureUse', field: 'maximum', featureId: id },
              maximum,
            ))
            const recovery = widget.recovery === 'none' ? 'manual' : widget.recovery
            nextDocument = characterSheetReducer(nextDocument, kind === 'resource'
              ? { type: 'resource/update', id, patch: { label: widget.title, recovery } }
              : { type: 'feature/update', id, patch: { title: widget.title, description: widget.notes, recovery } })
          }

          if (compacted) {
            nextDocument = characterSheetReducer(
              nextDocument,
              {
                type: 'feature/update',
                id: compacted.id,
                patch: { description: nextValue },
              },
            )
          } else {
            nextDocument = characterSheetReducer(nextDocument, {
              type: 'feature/add',
              value: {
                category: 'other', customFieldIds: [], description: nextValue,
                expanded: true, id: createClientId('feature-notes'), linkedEntityIds: [],
                recovery: null, recoveryLabel: '', title: '', uses: null,
              },
            })
          }

          dispatch(
            characterSheetActions.replaceDocument(nextDocument),
          )
        }}
        value={featuresToText(
          document.features,
          document.resources,
          document.customFields,
          document.customSections,
          valueFor,
        )}
        onValueChange={updateFeatures}
      />
    </SheetSection>
  )
}
