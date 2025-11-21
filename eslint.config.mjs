import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  {
    rules: {
      '@typescript-eslint/no-use-before-define': ['error', { functions: true, classes: true, variables: true }],
      '@typescript-eslint/no-shadow': ['error'],
      'no-shadow': 'off',
      'no-undef': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Adiciona a configuração do Prettier por último
  {
    plugins: {
      prettier,
      sonarjs,
      jsxA11y,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      // eslint-plugin-sonarjs
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-small-switch': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/no-collection-size-mischeck': 'error',
      'sonarjs/no-empty-collection': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/no-use-of-empty-return-value': 'error',
      'sonarjs/prefer-object-literal': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',

      // eslint-plugin-jsx-a11y
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
      'jsx-a11y/no-noninteractive-description': 'off',

      // eslint-plugin-simple-import-sort
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^@?\\w', '^@?\\w.*\\u0000$'],
            ['(?<!\\u0000)$', '(?<=\\u0000)$'],
            ['^\\.', '^\\..*\\u0000$'],
          ],
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'public/**',
    'lib/generated/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
