
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      base: '/', 
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/telegram': {
            target: 'https://api.telegram.org',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/telegram/, ''),
            secure: false
          }
        }
      },
      preview: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/telegram': {
            target: 'https://api.telegram.org',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/telegram/, ''),
            secure: false
          }
        }
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-ui': ['framer-motion', 'lucide-react'],
              'vendor-charts': ['recharts'],
              'vendor-xlsx': ['xlsx'],
              'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            },
          },
        },
      },
      plugins: [
        react()
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
