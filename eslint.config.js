import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'packages/*/dist/**', 'node_modules/**', 'docs/**'],
    },
    js.configs.recommended,
    {
        files: ['public/serv_work.js'],
        languageOptions: {
            globals: globals.serviceworker,
        },
    },
    {
        files: ['src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
        extends: [tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.browser,
        },
        rules: {
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-console': 'warn',
            'eol-last': ['error', 'always'],
            'no-restricted-imports': ['error', {
                patterns: [{ group: ['@/lib/*/*'], message: 'Импортируйте пакет через @/lib/<пакет>' }],
            }],
        },
    },
    {
        files: ['**/*.{js,ts,tsx}'],
        rules: {
            indent: ['error', 4, { SwitchCase: 1 }],
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],
        },
    },
    {
        files: ['src/**/*.test.tsx'],
        rules: {
            '@typescript-eslint/no-this-alias': 'off',
        },
    },
    {
        files: ['packages/logger/src/index.ts'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['*.config.js', 'server.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.node,
        },
    },
);
