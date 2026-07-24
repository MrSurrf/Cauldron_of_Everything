import type { Preview } from '@storybook/react-vite'
import { initialize, mswLoader } from 'msw-storybook-addon'

import '../src/shared/styles/tokens.css'
import '../src/app/styles/global.css'
import { mswHandlers } from './msw-handlers'

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' — показывать нарушения в Storybook, не ломая тесты.
      test: 'todo',
    },
    msw: {
      handlers: mswHandlers,
    },
  },
  beforeEach() {
    sessionStorage.removeItem('gm-demo-authorized')
  },
}

export default preview
