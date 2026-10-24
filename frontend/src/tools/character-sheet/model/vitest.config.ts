import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/tools/character-sheet/model/**/*.test.ts',
      'src/shared/ui/ContentEditor/**/*.test.ts',
    ],
  },
})
