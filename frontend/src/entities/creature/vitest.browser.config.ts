import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  optimizeDeps: {
    include: [
      'lexical', '@lexical/link', '@lexical/list', '@lexical/rich-text', '@lexical/utils',
      '@lexical/react/LexicalAutoFocusPlugin', '@lexical/react/LexicalCheckListPlugin',
      '@lexical/react/LexicalComposer', '@lexical/react/LexicalComposerContext',
      '@lexical/react/LexicalContentEditable', '@lexical/react/LexicalErrorBoundary',
      '@lexical/react/LexicalHistoryPlugin', '@lexical/react/LexicalLinkPlugin',
      '@lexical/react/LexicalListPlugin', '@lexical/react/LexicalOnChangePlugin',
      '@lexical/react/LexicalRichTextPlugin', '@lexical/react/useLexicalNodeSelection',
      '@atlaskit/pragmatic-drag-and-drop/element/adapter',
    ],
  },
  plugins: [react()],
  test: {
    browser: {
      api: { host: '127.0.0.1' },
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium' }],
      provider: playwright(),
    },
    include: ['src/entities/creature/**/*.browser.test.tsx', 'src/tools/campaign-table/ui/StatBlockFields.browser.test.tsx'],
  },
})
