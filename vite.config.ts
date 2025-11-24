import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'assets/dist',
        manifest: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/main.tsx'),
            },
        },
    },
    server: {
        cors: true,
        strictPort: true,
        port: 5173,
        hmr: {
            host: 'localhost',
        },
    },
});
