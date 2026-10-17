// Notes de travail du catalogue : statut et remarque par modèle, rangés dans catalogue/notes.json
// (versionné avec le code). Module Node, utilisé par le middleware de dev de vite.config.js
// (GET / POST /__catalogue/notes) et par les tests.
//   { version: 1, notes: { 'BAT-004': { status, note, updatedAt (ISO 8601) } } }
import fs from 'node:fs';

export const STATUS_KEYS = ['valide', 'a-retravailler', 'brouillon', 'retire'];
export const ID_RE = /^[A-Z]{3}-\d{3}$/;
const MAX_NOTE = 4000;

export function readNotes(file) {
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { version: 1, notes: d && d.notes && typeof d.notes === 'object' ? d.notes : {} };
  } catch {
    return { version: 1, notes: {} };
  }
}

// applique une modification ; status null efface le statut (retour à celui du registre)
export function applyNote(data, { id, status, note }, now = new Date()) {
  if (!ID_RE.test(String(id))) throw new Error(`identifiant invalide : ${id}`);
  if (status !== undefined && status !== null && !STATUS_KEYS.includes(status)) throw new Error(`statut inconnu : ${status}`);
  const next = { ...(data.notes[id] || {}) };
  if (status !== undefined) {
    if (status === null) delete next.status;
    else next.status = status;
  }
  if (note !== undefined) {
    const text = String(note ?? '').slice(0, MAX_NOTE);
    if (text.trim()) next.note = text;
    else delete next.note;
  }
  if (!next.status && !next.note) delete data.notes[id];
  else data.notes[id] = { ...next, updatedAt: now.toISOString() };
  return data;
}

// écriture stable (identifiants triés) pour des différences lisibles dans git
export function writeNotes(file, data) {
  const notes = {};
  for (const id of Object.keys(data.notes).sort()) {
    const n = data.notes[id];
    notes[id] = { ...(n.status ? { status: n.status } : {}), ...(n.note ? { note: n.note } : {}), updatedAt: n.updatedAt };
  }
  fs.writeFileSync(file, `${JSON.stringify({ version: 1, notes }, null, 2)}\n`);
}

// middleware de dev : GET renvoie toutes les notes (et la racine du projet pour les liens
// « ouvrir la source »), POST { id, status?, note? } enregistre une modification
export function notesMiddleware(file, root) {
  const send = (res, code, body) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };
  return (req, res) => {
    if (req.method === 'GET') {
      send(res, 200, { root, ...readNotes(file) });
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'méthode non prise en charge' });
      return;
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const patch = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const data = applyNote(readNotes(file), patch);
        writeNotes(file, data);
        send(res, 200, { ok: true, id: patch.id, note: data.notes[patch.id] || null });
      } catch (err) {
        send(res, 400, { error: err.message });
      }
    });
  };
}
