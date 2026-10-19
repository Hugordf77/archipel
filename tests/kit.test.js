// Aides du kit de modélisation (src/models/kit) : tubes des membres, laine en boucles, collier et
// cloche, peau déformée des visages, places réparties sur une surface, union lisse de surfaces et son
// maillage en grille, taches raffinées, anneau, cloche suisse et collier rond.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Builder } from '../src/render/builder.js';
import { limb, surface, scatter, skinMesh, union, grille, patch } from '../src/models/kit/formes.js';
import { curls } from '../src/models/kit/laine.js';
import { collar, anneauGeo, clocheSuisse, collier } from '../src/models/kit/accessoires.js';

const v = new THREE.Vector3();
const all = (attr, value) => Array.from(attr.array).every((x) => Math.abs(x - value) < 1e-6);

describe('kit : limb', () => {
  const tube = (end, pts = [[0, 0, 0], [0, -0.25, 0.012], [0, -0.4, 0], [0, -0.47, 0]], radii = [0.07, 0.064, 0.056, 0.045]) => {
    const bd = new Builder();
    limb(bd, '#ffffff', pts, radii, { sides: 10, rings: 4, end });
    return bd.build();
  };

  it('tube continu, sans bouchon interne, bout arrondi en option', () => {
    // un anneau de sommets par section : 2 × côtés × intervalles, aucun bouchon
    const pos = tube('open').attributes.position;
    expect(pos.count / 3).toBe(2 * 10 * 4);
    // aucune face transverse : toutes longent l'axe (vertical) de la patte
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1).sub(a);
      c.fromBufferAttribute(pos, i + 2).sub(a);
      expect(Math.abs(b.cross(c).normalize().y)).toBeLessThan(0.5);
    }
    // bout arrondi : deux anneaux de dôme et une pointe
    expect(tube('round').attributes.position.count / 3).toBe(2 * 10 * 6 + 10);
  });

  it('suit la courbe : chaque anneau est centré sur elle, au rayon interpolé point par point', () => {
    // axe vertical à pas réguliers : la courbe y est linéaire, le rayon passe de 0,1 à 0,02
    const radii = [0.1, 0.06, 0.02];
    const pos = tube('open', [[0, 0, 0], [0, -0.2, 0], [0, -0.4, 0]], radii).attributes.position;
    const r = (t) => {
      const i = Math.min(1, Math.floor(t * 2));
      return radii[i] + (radii[i + 1] - radii[i]) * (t * 2 - i);
    };
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      expect(Math.hypot(v.x, v.z)).toBeCloseTo(r(-v.y / 0.4), 4);
    }
  });

  it('ferme le bout arrondi par une pointe dans l’axe, un rayon plus loin', () => {
    const box = new THREE.Box3().setFromBufferAttribute(tube('round', [[0, 0, 0], [0, -0.2, 0], [0, -0.4, 0]], [0.1, 0.06, 0.02]).attributes.position);
    expect(box.min.y).toBeCloseTo(-0.42, 4);
  });
});

describe('kit : scatter', () => {
  const surf = surface([0, 0, 0], [0.3, 0.2, 0.4], 2);

  it('répartit des places sur la surface, jamais plus proches que l’espacement', () => {
    const pts = scatter(surf, 0.1, 3);
    expect(pts.length).toBeGreaterThan(30);
    for (const { p, n } of pts) {
      expect((p.x / 0.3) ** 2 + (p.y / 0.2) ** 2 + (p.z / 0.4) ** 2).toBeCloseTo(1, 6);
      expect(n.length()).toBeCloseTo(1, 6);
      expect(n.dot(p)).toBeGreaterThan(0); // normale vers l'extérieur
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(pts[i].p.distanceTo(pts[j].p)).toBeGreaterThanOrEqual(0.1 - 1e-9);
  });

  it('est reproductible pour une graine, change avec elle et écarte les zones refusées', () => {
    const key = (pts) => pts.map(({ p }) => p.toArray().map((x) => x.toFixed(6)).join(',')).join(';');
    expect(key(scatter(surf, 0.1, 3))).toBe(key(scatter(surf, 0.1, 3)));
    expect(key(scatter(surf, 0.1, 4))).not.toBe(key(scatter(surf, 0.1, 3)));
    const top = scatter(surf, 0.1, 3, (p) => p.y > 0);
    expect(top.length).toBeGreaterThan(10);
    for (const { p } of top) expect(p.y).toBeGreaterThan(0);
  });
});

describe('kit : curls (laine en boucles)', () => {
  const surf = surface([0, 0, 0], [0.2, 0.22, 0.36], 2.5);
  const keep = (q, n) => n.y > -0.8;

  it('pose une boucle blanche teintée par la robe à chaque place répartie', () => {
    const b = new Builder();
    curls(b, surf, 0.13, { seed: 1, keep });
    expect(b.parts.length).toBe(scatter(surf, 0.13, 1, keep).length);
    expect(b.parts.length).toBeGreaterThan(20);
    for (const g of b.parts) {
      expect(all(g.attributes.aTint, 1)).toBe(true);
      expect(all(g.attributes.color, 1)).toBe(true);
      // dôme de rayon espacement × 0,7 (± 15 %)
      const s = new THREE.Box3().setFromBufferAttribute(g.attributes.position).getSize(v);
      expect(Math.max(s.x, s.y, s.z)).toBeLessThanOrEqual(2 * 0.13 * 0.7 * 1.15 + 1e-6);
    }
  });

  it('suit la surface déplacée par at (boucles portées par une autre pièce)', () => {
    const a = new Builder();
    const b = new Builder();
    curls(a, surf, 0.13, { seed: 2 });
    curls(b, surf, 0.13, { seed: 2, at: [0, 1, 0] });
    expect(b.parts).toHaveLength(a.parts.length);
    const pa = a.parts[5].attributes.position;
    const pb = b.parts[5].attributes.position;
    for (let i = 0; i < pa.count; i++) {
      expect(pb.getX(i)).toBeCloseTo(pa.getX(i), 5);
      expect(pb.getY(i)).toBeCloseTo(pa.getY(i) + 1, 5);
    }
  });
});

describe('kit : collar (collier et cloche)', () => {
  const build = (k) => {
    const b = new Builder();
    collar(b, 0.4, 0.2, 0.123, 0.018, k);
    return b.parts;
  };

  it('pose collier, cloche, lèvre, anneau et battant, aux couleurs fixes (tint 0)', () => {
    const parts = build(0.68);
    expect(parts).toHaveLength(5);
    for (const g of parts) expect(all(g.attributes.aTint, 0)).toBe(true);
  });

  it('fait pendre la cloche sous la gorge, devant le cou, à la taille demandée', () => {
    const [ring, bell] = build(1).map((g) => new THREE.Box3().setFromBufferAttribute(g.attributes.position));
    expect(bell.max.y).toBeLessThan(ring.getCenter(v).y + 0.123);
    expect(bell.getCenter(new THREE.Vector3()).z).toBeGreaterThan(ring.getCenter(v).z);
    const h = (k) => new THREE.Box3().setFromBufferAttribute(build(k)[1].attributes.position).getSize(v).y;
    expect(h(1)).toBeCloseTo(0.09, 4);
    expect(h(0.5)).toBeCloseTo(0.045, 4);
  });
});

describe('kit : skinMesh', () => {
  const R = new THREE.Vector3(0.1, 0.12, 0.08);
  const at = (u, out) => out.copy(u).normalize().multiply(R);
  const mesh = () => {
    let geo = null;
    skinMesh({ add: (g) => { geo = g; } }, '#ffeedd', at, 20, 14);
    return geo;
  };

  it('maille la surface donnée sans fente : sommets soudés, chaque arête partagée par deux faces', () => {
    const g = mesh();
    expect(g.index).not.toBeNull();
    // sphère 20 × 14 soudée : couture et pôles fusionnés
    expect(g.attributes.position.count).toBe(20 * 13 + 2);
    const edges = new Map();
    const idx = g.index.array;
    for (let t = 0; t < idx.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = idx[t + e];
        const b = idx[t + ((e + 1) % 3)];
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        edges.set(k, (edges.get(k) || 0) + 1);
      }
    }
    expect([...edges.values()].every((n) => n === 2)).toBe(true);
  });

  it('pose chaque sommet sur la surface, normales unitaires tournées vers l’extérieur', () => {
    const g = mesh();
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);
      expect((v.x / R.x) ** 2 + (v.y / R.y) ** 2 + (v.z / R.z) ** 2).toBeCloseTo(1, 5);
      expect(n.length()).toBeCloseTo(1, 5);
      expect(n.dot(v)).toBeGreaterThan(0);
    }
  });
});

describe('kit : union (union lisse de surfaces)', () => {
  const A = { c: [0, 0, 0], rad: [0.3, 0.2, 0.4], n: 2.4 };
  const B = { c: [0, 0.18, 0.3], rad: [0.12, 0.12, 0.12], k: 0.06 };
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const u = new THREE.Vector3();

  it('une forme seule : la peau est la surface |x|^n + |y|^n + |z|^n = 1, normale unitaire vers l’extérieur', () => {
    const U = union([A], { rad: A.rad });
    for (let i = 0; i < 60; i++) {
      U.at(u.set(Math.cos(i * 2.4) * Math.sin(i * 0.37 + 0.3), Math.cos(i * 0.37 + 0.3), Math.sin(i * 2.4) * Math.sin(i * 0.37 + 0.3)), p, n);
      expect(Math.abs(p.x / 0.3) ** 2.4 + Math.abs(p.y / 0.2) ** 2.4 + Math.abs(p.z / 0.4) ** 2.4).toBeCloseTo(1, 3);
      expect(n.length()).toBeCloseTo(1, 6);
      expect(n.dot(p)).toBeGreaterThan(0);
    }
  });

  it('raccorde deux formes sans creux : chacune reste dedans, le pli entre elles est comblé', () => {
    const U = union([A, B], { rad: [0.3, 0.3, 0.45] });
    const dur = union([A, { ...B, k: 1e-6 }], { rad: [0.3, 0.3, 0.45] });
    // les deux surfaces de départ sont dans l'union (champ ≤ 0)
    for (const f of [A, B]) {
      const S = surface(f.c, f.rad, f.n ?? 2);
      for (let i = 0; i < 40; i++) {
        S.at(u.set(Math.cos(i), Math.sin(i * 1.3), Math.sin(i)).normalize(), p, n);
        expect(U.champ(p.x, p.y, p.z)).toBeLessThanOrEqual(1e-9);
      }
    }
    // le minimum doux ne retire jamais plus de k / 6 au champ de l'union dure, et le retire bien au
    // creux du raccord (entre le dos de A et l'arrière de B) : le pli est comblé
    let plus = 0;
    for (let i = 0; i < 400; i++) {
      const x = Math.sin(i * 1.7) * 0.3;
      const y = Math.cos(i * 0.9) * 0.3;
      const z = Math.sin(i * 0.53) * 0.45;
      const e = dur.champ(x, y, z) - U.champ(x, y, z);
      expect(e).toBeGreaterThanOrEqual(-1e-9);
      expect(e).toBeLessThanOrEqual(0.06 / 6 + 1e-9);
    }
    for (let a = 0.2; a < 1.4; a += 0.02) plus = Math.max(plus, dur.champ(0, 0.19 * Math.sin(a) / Math.sin(0.785), 0.19 * Math.cos(a) / Math.cos(0.785)) - U.champ(0, 0.19 * Math.sin(a) / Math.sin(0.785), 0.19 * Math.cos(a) / Math.cos(0.785)));
    expect(plus).toBeGreaterThan(0.002);
  });

  it('retranche une forme creuse (naseau) : son centre est hors de la peau', () => {
    const creux = { c: [0, 0, 0.4], rad: [0.03, 0.04, 0.03], k: 0.01, creux: true };
    const U = union([A, creux], { rad: A.rad });
    expect(union([A]).champ(0, 0, 0.395)).toBeLessThan(0);
    expect(U.champ(0, 0, 0.395)).toBeGreaterThan(0);
    U.at(u.set(0, 0, 1), p, n);
    expect(p.z).toBeLessThan(0.4 - 0.02);
  });
});

describe('kit : grille (maillage d’une surface vue de son centre)', () => {
  const U = union([{ c: [0, 0, 0], rad: [0.3, 0.2, 0.4], n: 2.4 }], { rad: [0.3, 0.2, 0.4] });
  const build = (bandes) => {
    const parts = [];
    grille({ add: (g, color, opts) => parts.push({ g, color, opts }) }, U, 16, 10, { axe: [0, 0, 1], bandes });
    return parts;
  };

  it('pose w × (h − 1) + 2 sommets sur la peau et 2 w (h − 1) faces tournées vers l’extérieur', () => {
    const [{ g }] = build([[Infinity, '#ffffff', 0]]);
    expect(g.attributes.position.count).toBe(16 * 9 + 2);
    expect(g.index.count / 3).toBe(2 * 16 * 9);
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    const idx = g.index.array;
    for (let t = 0; t < idx.length; t += 3) {
      a.fromBufferAttribute(pos, idx[t]);
      b.fromBufferAttribute(pos, idx[t + 1]).sub(a);
      c.fromBufferAttribute(pos, idx[t + 2]).sub(a);
      n.fromBufferAttribute(nor, idx[t]);
      expect(b.cross(c).dot(n)).toBeGreaterThan(0);
    }
  });

  it('colore par bandes de parallèles, frontière nette et sans fente (mêmes sommets des deux côtés)', () => {
    const parts = build([[4, '#f0b4a8', 0], [Infinity, '#f5e9d6', 1]]);
    expect(parts.map((q) => q.color)).toEqual(['#f0b4a8', '#f5e9d6']);
    expect(parts.map((q) => q.opts.tint)).toEqual([0, 1]);
    // même tableau de sommets, faces réparties sans perte : 16 + 3 × 32 faces dans la première bande
    expect(Array.from(parts[0].g.attributes.position.array)).toEqual(Array.from(parts[1].g.attributes.position.array));
    expect(parts[0].g.index.count / 3).toBe(16 + 3 * 32);
    expect((parts[0].g.index.count + parts[1].g.index.count) / 3).toBe(2 * 16 * 9);
  });
});

describe('kit : patch (option tol)', () => {
  // corps bosselé : la tache à faces planes doit rester au-dessus de la peau
  const U = union([{ c: [0, 0, 0], rad: [0.25, 0.25, 0.25] }, { c: [0.24, 0.08, 0], rad: [0.06, 0.06, 0.06], k: 0.03 }], { rad: [0.25, 0.25, 0.25] });
  const tache = (opts) => {
    let geo = null;
    patch({ add: (g) => { geo = g; } }, U, [1, 0.3, 0], [0.5, 0.5], 3, { lift: 0.002, seg: 16, couronnes: [0.5, 1], ...opts });
    return geo;
  };
  const sous = (g) => {
    const pos = g.attributes.position;
    const idx = g.index.array;
    const c = new THREE.Vector3();
    let n = 0;
    for (let t = 0; t < idx.length; t += 3) {
      c.set(0, 0, 0);
      for (let e = 0; e < 3; e++) c.add(new THREE.Vector3().fromBufferAttribute(pos, idx[t + e]));
      c.divideScalar(3);
      if (U.champ(c.x, c.y, c.z) < 0) n++;
    }
    return n;
  };

  it('sans tol, la tache garde son maillage ; avec tol (sous le décollement), elle est recoupée et ne passe plus sous la peau', () => {
    const brut = tache({});
    expect(brut.index.count / 3).toBe(16 + 32);
    expect(sous(brut)).toBeGreaterThan(0);
    const fine = tache({ tol: 0.001 });
    expect(fine.index.count).toBeGreaterThan(brut.index.count);
    expect(sous(fine)).toBe(0);
  });
});

describe('kit : anneau, cloche suisse, collier rond', () => {
  it('anneau : tube rond de rayon t autour d’une âme en superellipse, fermé sans couture', () => {
    const g = anneauGeo(0.1, 0.06, 4, 0.01, 8, 24);
    const pos = g.attributes.position;
    expect(pos.count).toBe(8 * 24);
    const box = new THREE.Box3().setFromBufferAttribute(pos);
    expect(box.max.x).toBeCloseTo(0.11, 4);
    expect(box.max.y).toBeCloseTo(0.07, 4);
    expect(box.max.z).toBeCloseTo(0.01, 4);
    const edges = new Map();
    const idx = g.index.array;
    for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
      const a = idx[t + e];
      const b = idx[t + ((e + 1) % 3)];
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(k, (edges.get(k) || 0) + 1);
    }
    expect([...edges.values()].every((n) => n === 2)).toBe(true);
  });

  it('cloche suisse : tronc de pyramide arrondi (plus large que profond, évasé vers le bas), bouche sombre, couleurs fixes', () => {
    const b = new Builder();
    clocheSuisse(b, [0, 0, 0], { k: 1 });
    expect(b.parts).toHaveLength(5);
    for (const g of b.parts) expect(all(g.attributes.aTint, 0)).toBe(true);
    const [dehors, bouche] = b.parts.map((g) => new THREE.Box3().setFromBufferAttribute(g.attributes.position));
    const s = dehors.getSize(v);
    expect(s.y).toBeCloseTo(0.095 * 1.008, 2);
    expect(s.x).toBeGreaterThan(s.z * 1.2);
    // section en bas plus large qu'en haut ; la bouche est sous la cloche, à l'intérieur
    const pos = b.parts[0].attributes.position;
    let bas = 0;
    let haut = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < dehors.min.y + 0.01) bas = Math.max(bas, Math.abs(pos.getX(i)));
      if (pos.getY(i) > dehors.max.y - 0.01) haut = Math.max(haut, Math.abs(pos.getX(i)));
    }
    expect(bas).toBeGreaterThan(haut * 1.4);
    expect(bouche.max.y).toBeLessThan(dehors.max.y);
    expect(new THREE.Color().fromBufferAttribute(b.parts[1].attributes.color, 0).getHSL({}).l).toBeLessThan(0.35);
  });

  it('collier : boucle sur le côté, cloche sous la gorge et devant le cou, contours distincts', () => {
    const b = new Builder();
    collier(b, 0.89, 0.3, [0.15, 0.17], 0.02, { id: 7, idCloche: 8 });
    expect(b.parts).toHaveLength(7);
    const ids = b.parts.map((g) => g.attributes.aId.array[0]);
    expect(ids.slice(0, 2)).toEqual([7, 7]);
    expect(new Set(ids.slice(2))).toEqual(new Set([8]));
    const [ring, boucle, cloche] = b.parts.map((g) => new THREE.Box3().setFromBufferAttribute(g.attributes.position));
    expect(boucle.getCenter(v).x).toBeGreaterThan(0.05);
    expect(cloche.max.y).toBeLessThan(ring.getCenter(new THREE.Vector3()).y);
    expect(cloche.getCenter(v).z).toBeGreaterThan(ring.getCenter(new THREE.Vector3()).z);
    // version allégée : sans boucle
    const lite = new Builder();
    collier(lite, 0.89, 0.3, [0.15, 0.17], 0.02, { lite: true });
    expect(lite.parts).toHaveLength(6);
  });
});
