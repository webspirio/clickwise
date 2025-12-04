import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'assets/dist/**', 'node_modules/**']
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.node,
                jQuery: 'readonly',
                clickwise_admin: 'readonly',
                clickwise: 'readonly'
            }
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                React: 'readonly',
                clickwise_admin: 'readonly',
                clickwise: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh
        },
        rules: {
            ...typescript.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                {
                    allowConstantExport: true
                }
            ]
        }
    }
];
