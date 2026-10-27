import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', 'docs/**'],
    },
    js.configs.recommended,
    {
        files: ['public/serv_work.js'],
        languageOptions: {
            globals: globals.serviceworker,
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
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
        files: ['src/lib/logger.ts'],
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
