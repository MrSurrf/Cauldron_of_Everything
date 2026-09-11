import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  optimizeDeps: { include: ['@lexical/react/useLexicalNodeSelection'] },
  plugins: [react()],
  test: {
    browser: {
      api: { host: '127.0.0.1' },
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium' }],
      provider: playwright(),
    },
    include: [
      'src/shared/ui/ContentEditor/**/*.browser.test.tsx',
    ],
  },
})
