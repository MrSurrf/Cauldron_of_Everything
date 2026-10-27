import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
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
      'src/entities/character-class/**/*.browser.test.tsx',
      'src/pages/encyclopedia/Class*.browser.test.tsx',
    ],
  },
})
