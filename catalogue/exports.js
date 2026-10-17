// Exports du catalogue : inventaire (CSV pour un tableur français, JSON) et planche contact PNG
// d'une catégorie, enregistrée aussi dans captures/ en dev (même méthode que les captures du jeu).
import { statsOf, boxOf, disposeObject } from './scene.js';

// une ligne par modèle : identité, statut, triangles, taille mesurée, usage
export async function inventory(models, statusOf, defaultParams, onProgress = () => {}) {
  const rows = [];
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    let tris = null;
    let size = m.size;
    try {
      const { object3d } = m.build(defaultParams(m));
      tris = statsOf(object3d).tris;
      const s = boxOf(object3d).getSize(object3d.position.clone());
      size = [s.x, s.y, s.z].map((v) => Math.round(v * 100) / 100);
      disposeObject(object3d);
    } catch (err) {
      console.warn(`inventaire ${m.id}`, err);
    }
    rows.push({ id: m.id, nom: m.name, categorie: m.category, statut: statusOf(m), triangles: tris, taille: size, utiliseDans: m.usedIn, source: m.source });
    // rendre la main au navigateur de temps en temps
    if (i % 12 === 11) {
      onProgress(i + 1, models.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return rows;
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const cell = (v) => {
  const s = Array.isArray(v) ? v.join(' | ') : v === null || v === undefined ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCSV(rows, name = 'inventaire-modeles.csv') {
  const head = ['id', 'nom', 'catégorie', 'statut', 'triangles', 'largeur (m)', 'hauteur (m)', 'profondeur (m)', 'utilisé dans', 'source'];
  const lines = rows.map((r) => [r.id, r.nom, r.categorie, r.statut, r.triangles, r.taille[0], r.taille[1], r.taille[2], r.utiliseDans, r.source]
    .map((v) => (typeof v === 'number' ? String(v).replace('.', ',') : cell(v))).join(';'));
  // BOM : les tableurs ouvrent l'UTF-8 (accents) correctement
  download(name, new Blob(['﻿', [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' }));
}

export function downloadJSON(rows, name = 'inventaire-modeles.json') {
  download(name, new Blob([JSON.stringify({ genere: new Date().toISOString(), modeles: rows }, null, 2)], { type: 'application/json' }));
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

// planche contact : vignettes peintes en grille, identifiant et nom sous chacune
export async function contactSheet(models, thumbs, title, defaultParams, file) {
  const COLS = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(models.length * 1.4))));
  const C = 220;
  const LABEL = 46;
  const PAD = 28;
  const HEAD = 76;
  const rows = Math.ceil(models.length / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = PAD * 2 + COLS * C + (COLS - 1) * 14;
  canvas.height = HEAD + PAD + rows * (C + LABEL) + (rows - 1) * 14 + PAD;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f7ecd7';
  g.fillRect(0, 0, canvas.width, canvas.height);
  await document.fonts?.ready;
  g.fillStyle = '#4f4058';
  g.font = '600 30px Fredoka, Nunito, sans-serif';
  g.fillText(title, PAD, 50);
  g.font = '600 14px Nunito, sans-serif';
  g.fillStyle = '#6f5f75';
  g.fillText(`Archipel · catalogue des modèles · ${models.length} modèle${models.length > 1 ? 's' : ''}`, PAD, 70);
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const x = PAD + (i % COLS) * (C + 14);
    const y = HEAD + PAD + Math.floor(i / COLS) * (C + LABEL + 14);
    const url = thumbs.urls.get(m.id) || thumbs.render(m, defaultParams(m));
    thumbs.urls.set(m.id, url);
    g.save();
    g.beginPath();
    g.roundRect(x, y, C, C + LABEL, 14);
    g.fillStyle = '#fff8ec';
    g.fill();
    g.clip();
    g.drawImage(await loadImage(url), x, y, C, C);
    g.restore();
    g.fillStyle = '#8c7c8c';
    g.font = '600 12px ui-monospace, Menlo, monospace';
    g.fillText(m.id, x + 12, y + C + 18);
    g.fillStyle = '#4f4058';
    g.font = '700 14px Nunito, sans-serif';
    let name = m.name;
    while (g.measureText(name).width > C - 24 && name.length > 4) name = `${name.slice(0, -2)}…`;
    g.fillText(name, x + 12, y + C + 37);
  }
  const url = canvas.toDataURL('image/png');
  // en dev, la planche rejoint aussi captures/ ; partout, elle se télécharge
  if (import.meta.env.DEV) fetch(`/__capture?name=${encodeURIComponent(file)}`, { method: 'POST', body: url }).catch(() => {});
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file}.png`;
  a.click();
  return url;
}
