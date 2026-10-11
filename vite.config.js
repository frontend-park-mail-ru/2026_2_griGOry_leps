import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
    // JSX компилируется в вызовы нашего h() из src/vdom, импорт подставляется в каждый .jsx сам
    esbuild: {
        jsx: 'transform',
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsxInject: 'import { h, Fragment } from \'@/vdom/index.js\';',
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
        include: ['src/**/*.test.{js,jsx}'],
    },
});
