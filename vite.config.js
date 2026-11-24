import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { notesMiddleware } from './catalogue/notesStore.js';
import { productionMiddleware } from './scripts/production/actions.mjs';

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

// Banc de rendu (scripts/rendu/banc/) : POST /__banc?chemin=<série>/<nom>.png|.json enregistre une
// capture (data URL) ou un manifeste JSON sous captures/banc/ ; chemin limité à captures/banc
function bancPlugin() {
  return {
    name: 'ile-banc',
    apply: 'serve',
    configureServer(server) {
      const racine = path.resolve('captures/banc');
      server.middlewares.use('/__banc', (req, res) => {
        // GET : liste des séries (manifestes résumés), pour le tableau de bord (#rendu)
        if (req.method === 'GET') {
          const series = fs.existsSync(racine) ? fs.readdirSync(racine).filter((d) => fs.existsSync(path.join(racine, d, 'manifeste.json'))) : [];
          const liste = series.map((d) => {
            const m = JSON.parse(fs.readFileSync(path.join(racine, d, 'manifeste.json'), 'utf8'));
            const a = (f) => fs.existsSync(path.join(racine, d, f));
            return { serie: d, fin: m.fin, qualite: m.qualite, taille: m.taille, rejets: m.rejets, cadrages: Object.keys(m.cadrages), metriques: a('metriques.json'), comparaison: a('comparaison.json'), planche: a('planche.png'), portes: a('portes.json') };
          }).sort((x, y) => (y.fin || '').localeCompare(x.fin || ''));
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(liste));
          return;
        }
        const rel = new URL(req.url, 'http://x').searchParams.get('chemin') || '';
        const file = path.resolve(racine, rel);
        if (req.method !== 'POST' || !/^[a-z0-9_/.-]+\.(png|json)$/i.test(rel) || !file.startsWith(racine + path.sep)) {
          res.statusCode = 400;
          res.end();
          return;
        }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const body = Buffer.concat(chunks);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          if (file.endsWith('.png')) fs.writeFileSync(file, Buffer.from(body.toString().replace(/^data:image\/\w+;base64,/, ''), 'base64'));
          else fs.writeFileSync(file, body);
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

// Suivi de production de l'open world : GET / POST /__production lit le journal
// (production/journal.jsonl) et y exécute les actions du dashboard (docs/PRODUCTION.md)
function productionPlugin() {
  return {
    name: 'production',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__production', productionMiddleware(process.cwd()));
    },
  };
}

export default defineConfig({
  plugins: [capturePlugin(), bancPlugin(), catalogueNotesPlugin(), productionPlugin()],
  // IPv4 explicite : « localhost » et 127.0.0.1 fonctionnent dans tous les navigateurs ;
  // les notes du catalogue s'écrivent sans recharger la page
  server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: { ignored: ['**/catalogue/notes.json', '**/production/journal.jsonl', '**/production/.journal.lock'] } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    // pages : le jeu, le catalogue des modèles et le tableau de bord
    rollupOptions: { input: { main: path.resolve('index.html'), catalogue: path.resolve('catalogue.html'), dashboard: path.resolve('dashboard.html') } },
  },
  // l'ancienne version (archive/) n'est plus testée
  test: { include: ['tests/**/*.test.js'] },
});
