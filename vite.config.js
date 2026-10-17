import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { notesMiddleware } from './catalogue/notesStore.js';

// Petit plugin de dev : POST /__capture?name=xxx enregistre un PNG dans ./captures
// (sert à produire les captures de chaque étape directement depuis le canvas).
function capturePlugin() {
  return {
    name: 'ile-capture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'capture')
          .replace(/[^a-z0-9_-]/gi, '');
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          const b64 = body.replace(/^data:image\/\w+;base64,/, '');
          const dir = path.resolve('captures');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(b64, 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

// Catalogue des modèles : GET / POST /__catalogue/notes lit et enregistre statuts et remarques
// dans catalogue/notes.json (versionné)
function catalogueNotesPlugin() {
  return {
    name: 'catalogue-notes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__catalogue/notes', notesMiddleware(path.resolve('catalogue/notes.json'), process.cwd()));
      // code source brut d'un constructeur (empreinte des vignettes, ligne « ouvrir la source »),
      // limité à src/models
      server.middlewares.use('/__catalogue/source', (req, res) => {
        const rel = new URL(req.url, 'http://x').searchParams.get('path') || '';
        const file = path.resolve(rel);
        if (!file.startsWith(path.resolve('src/models') + path.sep) || !file.endsWith('.js') || !fs.existsSync(file)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(fs.readFileSync(file, 'utf8'));
      });
    },
  };
}

export default defineConfig({
  plugins: [capturePlugin(), catalogueNotesPlugin()],
  // IPv4 explicite : « localhost » et 127.0.0.1 fonctionnent dans tous les navigateurs ;
  // les notes du catalogue s'écrivent sans recharger la page
  server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: { ignored: ['**/catalogue/notes.json'] } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    // deux pages : le jeu et le catalogue des modèles
    rollupOptions: { input: { main: path.resolve('index.html'), catalogue: path.resolve('catalogue.html') } },
  },
  // l'ancienne version (archive/) n'est plus testée
  test: { include: ['tests/**/*.test.js'] },
});
