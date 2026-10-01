import { defineConfig } from "vite";
import * as path from "path";
import Handlebars from "handlebars";

function handlebarsPlugin() {
    return {
        name: 'vite-plugin-hbs-module',
        transform(src, id) {
            if (!id.endsWith('.hbs')) return;

            const precompiled = Handlebars.precompile(src);

            return {
                code: `
                    import Handlebars from 'handlebars/runtime';
                    const template = Handlebars.template(${precompiled});
                    export default template;
                `,
                map: null,
            };
        },
    };
}

export default defineConfig({
    plugins: [handlebarsPlugin()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                cookieDomainRewrite: 'localhost',
            },
        },
    },
});
