import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended],
    plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...reactRefresh.configs.vite.rules,
      // Component files intentionally colocate their public props/types and form schemas.
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': 'off',
    },
    languageOptions: { ecmaVersion: 2020, globals: globals.browser, parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
  },
])
