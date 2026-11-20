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
      viewport: { width: 1280, height: 800 },
      instances: [
        {
          browser: 'chromium',
          name: 'cursor-lighting',
          provider: playwright({ contextOptions: { reducedMotion: 'no-preference', forcedColors: 'none' } }),
        },
        {
          browser: 'chromium',
          name: 'cursor-lighting-reduced-motion',
          provider: playwright({ contextOptions: { reducedMotion: 'reduce', forcedColors: 'none' } }),
        },
        {
          browser: 'chromium',
          name: 'cursor-lighting-forced-colors',
          provider: playwright({ contextOptions: { reducedMotion: 'no-preference', forcedColors: 'active' } }),
        },
      ],
    },
    include: ['src/shared/ui/CursorLighting/**/*.browser.test.tsx'],
  },
})
