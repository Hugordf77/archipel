// Raccord de la nage au gabarit du personnage (Player + navigation, sans rendu) : on entre dans un lac
// en pente douce, on nage, puis on en ressort. La racine (les pieds) suit la ligne d'eau NAGE
// (gabarit.js) ; les seuils de la nage doivent en découler, pour que la racine ne s'enfonce pas sous le
// fond plus que ne le faisait le chibi (0,065 m à l'entrée, 0,215 m à la sortie).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Player } from '../src/entities/Player.js';
import { setGroundProvider, setWaterProvider, setObstacles, groundAt, waterDepth } from '../src/world/navigation.js';
import { NAGE, GABARIT } from '../src/models/personnage/gabarit.js';

// loin de l'île de départ : relief et lac viennent des fournisseurs
const X0 = 300;
const Z0 = 300;
const LAC = 5; // m : niveau du lac (eau douce, calme)
const PENTE = 0.1; // le fond descend de 10 cm par mètre vers +z, de la rive (z = Z0) jusqu'à 1,4 m d'eau
const fond = (x, z) => LAC + 0.3 - PENTE * Math.min(17, Math.max(0, z - Z0));

const stubCharacter = () => ({
  root: { position: new THREE.Vector3(), rotation: { y: 0 } },
  pose: 'idle',
  busy: false,
  poses: new Set(),
  setPose(p) {
    this.pose = p;
    this.poses.add(p);
  },
  update() {},
  bounce() {},
});

function traversee(fps = 60) {
  setObstacles([]);
  setGroundProvider(fond);
  setWaterProvider(() => LAC);
  const p = new Player(stubCharacter());
  p.place(X0, Z0 - 1, 0);
  const dt = 1 / fps;
  const out = { entree: null, sortie: null, pire: Infinity, gue: [] };
  const step = (dir) => {
    p.update(dt, { move: new THREE.Vector3(0, 0, dir), walk: true });
    const d = waterDepth(p.pos.x, p.pos.z);
    if (p.swimming) out.pire = Math.min(out.pire, p.pos.y - groundAt(p.pos.x, p.pos.z).y);
    return d;
  };
  // vers le large jusqu'à nager depuis 2 s
  let swimT = 0;
  for (let i = 0; i < 20 * fps && swimT < 2; i++) {
    const was = p.swimming;
    const d = step(1);
    if (!was && p.swimming && out.entree === null) out.entree = d;
    if (p.swimming) swimT += dt;
  }
  // demi-tour vers la rive : on reprend pied, puis on patauge jusqu'au bord
  for (let i = 0; i < 20 * fps; i++) {
    const was = p.swimming;
    const d = step(-1);
    if (was && !p.swimming && out.sortie === null) out.sortie = d;
    else if (out.sortie !== null && !p.swimming && d > 0.3) out.gue.push([d, p.env.surface]);
    else if (out.sortie !== null && d <= 0.3) break;
  }
  setGroundProvider(null);
  setWaterProvider(null);
  return out;
}

describe(`nage : seuils portés au gabarit (${GABARIT.nom})`, () => {
  it('on nage en eau profonde, la racine jamais à plus de 0,23 m sous le fond, et l’on en ressort', () => {
    const r = traversee();
    expect(r.entree).not.toBeNull();
    expect(r.sortie).not.toBeNull();
    // à l'entrée, l'eau monte à la poitrine : la racine, à NAGE sous la surface, reste à moins de 7 cm
    // sous le fond (chibi : 6,5 cm) ; avant correction, héros : 32 cm
    expect(r.entree - NAGE).toBeGreaterThan(-0.07);
    // pendant la nage, jusqu'à la sortie : jamais plus de 0,23 m sous le fond (chibi : 0,215 m) ;
    // avant correction, héros : 0,47 m
    expect(r.pire).toBeGreaterThan(-0.23);
    expect(r.sortie - NAGE).toBeGreaterThan(-0.23);
    // hystérésis : on ressort dans une eau moins profonde que celle où l'on s'est mis à nager
    expect(r.sortie).toBeLessThan(r.entree);
  });

  it('sorti de la nage, on patauge (surface « shallow ») jusqu’à 30 cm d’eau', () => {
    const r = traversee();
    expect(r.gue.length).toBeGreaterThan(10);
    for (const [d, s] of r.gue) expect(s, `${d.toFixed(2)} m d'eau`).toBe('shallow');
  });
});
