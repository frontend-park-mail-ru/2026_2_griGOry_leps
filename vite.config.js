import { defineConfig } from 'vitest/config';
import { babel } from '@rollup/plugin-babel';
import * as path from 'path';

export default defineConfig({
    // JSX → jsx() из src/vdom/jsx-runtime.ts, импорт подставляется сам
    esbuild: {
        jsx: 'automatic',
        jsxImportSource: '@/vdom',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/'),
        },
    },
    server: {
        port: 5173,
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
    },
    plugins: [
        {
            ...babel({
                babelHelpers: 'bundled',
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                exclude: 'node_modules/**',

                babelrc: false,
                configFile: false,

                presets: [
                    [
                        '@babel/preset-env',
                        {modules: false},
                    ],
                    [
                        '@babel/preset-react',
                        {
                            runtime: 'automatic',
                            importSource: '@/vdom',
                            development: false,
                        }
                    ],
                    [
                        '@babel/preset-typescript',
                        { onlyRemoveTypeImports: true }
                    ],
                ],
            }),
            enforce: 'pre',
        },
    ],
});
