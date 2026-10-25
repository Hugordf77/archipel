// Notes du catalogue : le middleware de dev lit et écrit catalogue/notes.json sans perte.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { readNotes, applyNote, writeNotes, notesMiddleware } from '../catalogue/notesStore.js';

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'catalogue-notes-')), 'notes.json');

// requête et réponse factices, au format des middlewares connect de Vite
function call(mw, method, body) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(text) { resolve({ status: this.statusCode, body: JSON.parse(text) }); },
    };
    mw(req, res);
    if (body !== undefined) req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    req.emit('end');
  });
}

describe('notes du catalogue', () => {
  it('relit exactement ce qui a été écrit (accents, retours à la ligne, statuts)', () => {
    const file = tmpFile();
    const data = { version: 1, notes: {} };
    const t = new Date('2026-10-17T15:42:00.000Z');
    applyNote(data, { id: 'BAT-004', status: 'a-retravailler', note: 'Ailes trop fines\n« voilure » à épaissir — 2 cm' }, t);
    applyNote(data, { id: 'ARB-001', status: 'valide' }, t);
    applyNote(data, { id: 'ANI-019', note: 'Halo seul : prévoir un corps ?' }, t);
    writeNotes(file, data);
    expect(readNotes(file)).toEqual(data);
    // écriture stable : identifiants triés
    expect(Object.keys(JSON.parse(fs.readFileSync(file, 'utf8')).notes)).toEqual(['ANI-019', 'ARB-001', 'BAT-004']);
  });

  it('efface une entrée revenue à l’état du registre et refuse les données invalides', () => {
    const data = { version: 1, notes: {} };
    applyNote(data, { id: 'STR-018', status: 'brouillon', note: 'doublon de STR-017' });
    applyNote(data, { id: 'STR-018', status: null, note: '' });
    expect(data.notes).toEqual({});
    expect(() => applyNote(data, { id: 'XX', status: 'valide' })).toThrow();
    expect(() => applyNote(data, { id: 'BAT-001', status: 'peut-etre' })).toThrow();
  });

  it('passe par le middleware de dev : POST enregistre, GET relit, sans perte', async () => {
    const file = tmpFile();
    const mw = notesMiddleware(file, '/projet');
    const note = 'Toit à recolorer\nvoir la maison du village';
    const post = await call(mw, 'POST', { id: 'BAT-001', status: 'a-retravailler', note });
    expect(post.status).toBe(200);
    expect(post.body.note.status).toBe('a-retravailler');
    await call(mw, 'POST', { id: 'NAV-004', status: 'valide' });
    const get = await call(mw, 'GET');
    expect(get.body.root).toBe('/projet');
    expect(get.body.notes['BAT-001'].note).toBe(note);
    expect(get.body.notes['NAV-004'].status).toBe('valide');
    expect(get.body.notes['BAT-001'].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // le fichier sur disque est identique à ce que renvoie GET
    expect(readNotes(file).notes).toEqual(get.body.notes);
    const bad = await call(mw, 'POST', '{ pas du json');
    expect(bad.status).toBe(400);
    expect(readNotes(file).notes).toEqual(get.body.notes);
  });
});
