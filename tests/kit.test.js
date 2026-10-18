// Aides du kit de modélisation (src/models/kit) : tubes des membres, laine en boucles, collier et
// cloche, peau déformée des visages, places réparties sur une surface.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Builder } from '../src/render/builder.js';
import { limb, surface, scatter, skinMesh } from '../src/models/kit/formes.js';
import { curls } from '../src/models/kit/laine.js';
import { collar } from '../src/models/kit/accessoires.js';

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
