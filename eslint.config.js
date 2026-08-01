import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist', '.next', 'node_modules', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        AbortController: 'readonly',
        Blob: 'readonly',
        clearInterval: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        globalThis: 'readonly',
        process: 'readonly',
        setInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        window: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': 'off',
    },
  },
]
