// Dépôt du suivi de production (Node) : lit zones.json, agents.json et le journal
// production/journal.jsonl, et y ajoute des événements. Le journal est en ajout seul : chaque ligne
// porte le hachage de la précédente (chaîne SHA-256), si bien qu'une ligne réécrite ou supprimée
// est détectée par verifierChaine(). Un lot d'événements est vérifié en entier (etat.js) avant
// d'être écrit : un refus n'écrit rien. Un verrou de fichier sérialise les écritures (CLI et serveur
// de dev). Les clés d'idempotence rendent la répétition d'une commande sans effet.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { contexte, rejouer, appliquer } from '../../src/production/etat.js';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const fichiers = (racine = RACINE) => ({
  zones: path.join(racine, 'production/zones.json'),
  agents: path.join(racine, 'production/agents.json'),
  journal: path.join(racine, 'production/journal.jsonl'),
  verrou: path.join(racine, 'production/.journal.lock'),
});

export const lireJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (texte) => crypto.createHash('sha256').update(texte).digest('hex');
export const empreinteFichier = (f) => sha(fs.readFileSync(f));
const corps = (e) => JSON.stringify({ seq: e.seq, id: e.id, type: e.type, at: e.at, acteur: e.acteur, cle: e.cle, donnees: e.donnees });
export const hacher = (prev, e) => sha(`${prev}\n${corps(e)}`);

export function lireJournal(file) {
  if (!fs.existsSync(file)) return { evenements: [], erreurs: [] };
  const evenements = [];
  const erreurs = [];
  fs.readFileSync(file, 'utf8').split('\n').forEach((ligne, i) => {
    if (!ligne.trim()) return;
    try {
      evenements.push(JSON.parse(ligne));
    } catch {
      erreurs.push({ ligne: i + 1, erreur: 'ligne illisible (JSON invalide)' });
    }
  });
  return { evenements, erreurs };
}

// intégrité : numérotation continue, chaînage et hachage de chaque ligne
export function verifierChaine(evenements) {
  const erreurs = [];
  let prev = '';
  evenements.forEach((e, i) => {
    if (e.seq !== i + 1) erreurs.push({ evenement: e.id, erreur: `numéro ${e.seq} au lieu de ${i + 1} (ligne supprimée ou insérée)` });
    if (e.prev !== prev) erreurs.push({ evenement: e.id, erreur: 'chaînage rompu (ligne précédente modifiée ou supprimée)' });
    if (e.hash !== hacher(e.prev, e)) erreurs.push({ evenement: e.id, erreur: 'contenu modifié après écriture' });
    prev = e.hash;
  });
  return erreurs;
}

export function charger(racine = RACINE) {
  const f = fichiers(racine);
  const ctx = contexte(lireJSON(f.zones), lireJSON(f.agents));
  const lu = lireJournal(f.journal);
  const { etat, erreurs } = rejouer(lu.evenements, ctx);
  return { ctx, etat, evenements: lu.evenements, erreurs, integrite: [...lu.erreurs, ...verifierChaine(lu.evenements)] };
}

function attendre(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function avecVerrou(f, fn) {
  const debut = Date.now();
  let fd = null;
  while (fd === null) {
    try {
      fd = fs.openSync(f.verrou, 'wx');
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // verrou abandonné (processus interrompu) au-delà de 30 s
      try { if (Date.now() - fs.statSync(f.verrou).mtimeMs > 30000) fs.rmSync(f.verrou, { force: true }); } catch { /* déjà libéré */ }
      if (Date.now() - debut > 10000) throw new Error('journal verrouillé par une autre écriture');
      attendre(25);
    }
  }
  try {
    return fn();
  } finally {
    fs.closeSync(fd);
    fs.rmSync(f.verrou, { force: true });
  }
}

// Ajoute un lot de brouillons { type, acteur, cle, donnees } ; renvoie les événements écrits et
// ceux ignorés (clé déjà présente). Lève une erreur sans rien écrire si un brouillon est refusé.
export function ajouter(brouillons, { racine = RACINE, maintenant = () => new Date() } = {}) {
  const f = fichiers(racine);
  return avecVerrou(f, () => {
    const { ctx, etat, evenements, integrite } = charger(racine);
    if (integrite.length) throw new Error(`journal corrompu, écriture refusée : ${integrite[0].erreur}`);
    let prev = evenements.at(-1)?.hash || '';
    let seq = evenements.length;
    const ajoutes = [];
    const ignores = [];
    for (const b of brouillons) {
      if (b.cle && etat.cles.has(b.cle)) {
        ignores.push(b.cle);
        continue;
      }
      seq += 1;
      const e = { seq, id: `EVT-${String(seq).padStart(6, '0')}`, type: b.type, at: maintenant().toISOString(), acteur: b.acteur, cle: b.cle || `auto:${seq}`, donnees: b.donnees };
      appliquer(etat, e, ctx); // lève ErreurWorkflow : rien n'est écrit
      e.prev = prev;
      e.hash = hacher(prev, e);
      prev = e.hash;
      ajoutes.push(e);
    }
    if (ajoutes.length) {
      fs.mkdirSync(path.dirname(f.journal), { recursive: true });
      fs.appendFileSync(f.journal, ajoutes.map((e) => `${JSON.stringify(e)}\n`).join(''));
    }
    return { ajoutes, ignores, etat, ctx };
  });
}
