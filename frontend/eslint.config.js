// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([globalIgnores([
  'dist',
  'storybook-static',
  'public/mockServiceWorker.js',
]), {
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
  ],
  languageOptions: {
    globals: globals.browser,
  },
}, {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/shared/ui/Checkbox/Checkbox.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value='checkbox']",
        message: 'Используйте общий Checkbox из shared/ui вместо локального input[type="checkbox"].',
      },
      {
        selector: "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'] > JSXExpressionContainer > Literal[value='checkbox']",
        message: 'Используйте общий Checkbox из shared/ui вместо локального input[type="checkbox"].',
      },
      {
        selector: "JSXOpeningElement > JSXAttribute[name.name='role'][value.value='checkbox']",
        message: 'Используйте общий Checkbox из shared/ui вместо локального role="checkbox".',
      },
      {
        selector: "JSXOpeningElement > JSXAttribute[name.name='role'] > JSXExpressionContainer > Literal[value='checkbox']",
        message: 'Используйте общий Checkbox из shared/ui вместо локального role="checkbox".',
      },
    ],
  },
}, ...storybook.configs["flat/recommended"]])
