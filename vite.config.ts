
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
      },
      plugins: [
        react(),
        {
          name: 'api-dev-middleware',
          configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
              if (req.url && req.url.startsWith('/api/tg-sync')) {
                const { default: handler } = await import('./api/telegram-sync.js');
                const parsedUrl = new URL(req.url, 'http://localhost:3000');
                const query = Object.fromEntries(parsedUrl.searchParams.entries());
                let body = {};
                if (req.method === 'POST') {
                  const buffers = [];
                  for await (const chunk of req) buffers.push(chunk);
                  try { body = JSON.parse(Buffer.concat(buffers).toString()); } catch {}
                }
                const mockRes = {
                  setHeader: (k, v) => res.setHeader(k, v),
                  status: (code) => {
                    res.statusCode = code;
                    return mockRes;
                  },
                  json: (data) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  send: (data) => res.end(data),
                  end: () => res.end()
                };
                return handler({ ...req, query, body }, mockRes);
              }
              next();
            });
          }
        }
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
