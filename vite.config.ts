
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      // Важно для GitHub Pages: относительные пути к ассетам
      base: './', 
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        outDir: 'dist',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: "Семейный Бюджет",
            short_name: "Бюджет",
            description: "Умный трекер финансов и покупок для семьи с AI",
            theme_color: "#EBEFF5",
            background_color: "#EBEFF5",
            display: "standalone",
            orientation: "portrait-primary",
            icons: [
              {
                src: "https://cdn-icons-png.flaticon.com/512/10543/10543268.png",
                sizes: "192x192",
                type: "image/png"
              },
              {
                src: "https://cdn-icons-png.flaticon.com/512/10543/10543268.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            navigateFallback: 'index.html',
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*$/,
                handler: 'NetworkOnly',
              },
              {
                urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*$/,
                handler: 'NetworkOnly',
              },
              {
                urlPattern: /^https:\/\/.*\.google\.com\/.*$/,
                handler: 'NetworkOnly',
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
