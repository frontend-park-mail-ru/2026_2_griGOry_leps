import js from '@eslint/js';
import globals from 'globals';

/**
 * В ESLint 9 no-unused-vars не видит переменные, которые используются только в JSX
 * (например, импортированный компонент <FormField />). Это правило помечает их использованными.
 */
const jsxUsesVars = {
    meta: { type: 'problem', schema: [] },
    create(context) {
        return {
            JSXOpeningElement(node) {
                let name = node.name;
                while (name.type === 'JSXMemberExpression') name = name.object;
                if (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) {
                    context.sourceCode.markVariableAsUsed(name.name, node);
                }
            },
        };
    },
};

export default [
    {
        ignores: ['dist/**', 'node_modules/**', 'docs/**'],
    },
    js.configs.recommended,
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.browser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            local: { rules: { 'jsx-uses-vars': jsxUsesVars } },
        },
        rules: {
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-console': 'warn',
            'eol-last': ['error', 'always'],
            'local/jsx-uses-vars': 'error',
        },
    },
    {
        files: ['**/*.{js,jsx}'],
        rules: {
            indent: ['error', 4, { SwitchCase: 1 }],
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],
        },
    },
    {
        files: ['src/lib/logger.js'],
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
];
