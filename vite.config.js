import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { resolveAnimeSama } from './api/anime.js'
import { resolveNativeMovieStream } from './api/movie.js'

function apiPlugin() {
  return {
    name: 'erodium-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/anime')) {
          try {
            const url = new URL(req.url, 'http://localhost');
            const title = url.searchParams.get('title');
            const season = url.searchParams.get('season') || 1;
            const episode = url.searchParams.get('episode') || 1;
            const lang = url.searchParams.get('lang') || 'vf';

            const result = await resolveAnimeSama({ title, season, episode, lang });
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        if (req.url.startsWith('/api/movie')) {
          try {
            const url = new URL(req.url, 'http://localhost');
            const tmdbId = url.searchParams.get('tmdbId');
            const imdbId = url.searchParams.get('imdbId');
            const type = url.searchParams.get('type') || 'movie';
            const season = url.searchParams.get('season') || 1;
            const episode = url.searchParams.get('episode') || 1;
            const title = url.searchParams.get('title') || '';

            const result = await resolveNativeMovieStream({ tmdbId, imdbId, type, season, episode, title });
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiPlugin(),
  ],
})
