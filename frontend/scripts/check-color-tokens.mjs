import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const sourceRoot = path.resolve('src')
const checkedExtensions = new Set(['.css', '.ts', '.tsx'])
const allowedPaths = [
  'shared/styles/tokens.css',
  'tools/survey/',
  'entities/creature/ui/DamageAffinityBadge/',
]
const hexColorPattern = /#[0-9a-f]{3,8}(?![0-9a-z_-])/gi

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function isAllowed(relativePath) {
  return allowedPaths.some((allowedPath) => (
    allowedPath.endsWith('/')
      ? relativePath.startsWith(allowedPath)
      : relativePath === allowedPath
  ))
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath]
  }))
  return nested.flat()
}

const violations = []
const files = await collectFiles(sourceRoot)

for (const filePath of files) {
  if (!checkedExtensions.has(path.extname(filePath))) continue

  const relativePath = normalize(path.relative(sourceRoot, filePath))
  if (isAllowed(relativePath)) continue

  const source = await readFile(filePath, 'utf8')
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const colors = [...line.matchAll(hexColorPattern)].map((match) => match[0])
    if (colors.length > 0) {
      violations.push(`${relativePath}:${index + 1} — ${colors.join(', ')}`)
    }
  }
}

if (violations.length > 0) {
  console.error('Локальные HEX запрещены. Добавьте primitive в shared/styles/tokens.css и используйте semantic token:')
  for (const violation of violations) console.error(`  ${violation}`)
  process.exitCode = 1
} else {
  console.log('Color tokens: локальных HEX вне разрешённых зон нет.')
}
