import {
  createClientId,
  featureUseFormulaVariable,
  resourceFormulaVariable,
  type CharacterFeature,
  type CustomField,
  type CustomSection,
  type ResourcePool,
} from '../../model'
import { CharacterNotesEditor } from '../notes'
import { SheetSection } from '../SheetSection'
import styles from './CharacterFeaturesSection.module.css'
import type { CharacterSheetViewModel } from './sheetViewModel'

export type CharacterFeaturesSectionProps = {
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
  if (compacted) return compacted.description

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
  sheet,
}: CharacterFeaturesSectionProps) {
  const {
    dispatch,
    document,
    updateNumericField,
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
    <SheetSection title="Особенности, умения и заметки">
      <CharacterNotesEditor
        accessibleLabel="Особенности, умения и заметки"
        className={styles.featuresEditor}
        placeholder="Особенности персонажа, способности и заметки..."
        rows={10}
        showStructureActions={true}
        onStructuredResourceChange={
          compacted
            ? undefined
            : (source, current) => {
                const separator = source.indexOf(':')
                if (separator <= 0 || separator === source.length - 1) {
                  return
                }

                const kind = source.slice(0, separator)
                const id = source.slice(separator + 1)

                if (kind === 'resource') {
                  const resource = document.resources.find(
                    (entry) => entry.id === id,
                  )
                  if (!resource) return

                  updateNumericField(
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
                  )
                  return
                }

                if (kind === 'feature') {
                  const feature = document.features.find(
                    (entry) => entry.id === id,
                  )
                  if (!feature?.uses) return

                  updateNumericField(
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
                  )
                }
              }
        }
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
