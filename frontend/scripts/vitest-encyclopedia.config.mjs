import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/pages/encyclopedia/encyclopediaHistory.test.ts', 'src/pages/encyclopedia/encyclopediaSearchHistory.test.ts'],
  },
})
