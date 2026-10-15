import { defineConfig } from 'vitest/config';
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
});
