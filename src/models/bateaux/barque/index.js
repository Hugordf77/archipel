// Barque (NAV-002) : coque arrondie turquoise, deux bancs et deux rames.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, hull, construire, boat } from '../commun.js';
import { fiche } from '../../kit/fiches.js';

export const caracteristiques = { name: 'Barque', speed: 6, zone: 1050, sail: false, hold: 0, len: 4.2, seat: [0, 0.38, -0.2], desc: 'Une coque solide et deux rames : on va déjà bien plus loin.' };

export function dessin(b, { body, oars, m }) {
  hull(b, 4.2, 1.6, 0.55, '#86c6bb', '#5a9e94');
  b.add(G.box(1.3, 0.07, 0.36, 0.03), WOOD_L, { p: [0, 0.32, -0.2] });
  b.add(G.box(1.1, 0.07, 0.36, 0.03), WOOD_L, { p: [0, 0.32, 1.2] });
  b.add(G.box(0.12, 0.42, 0.12, 0.03), WOOD_D, { p: [0, 0.36, 2.0] });
  for (const sx of [-1, 1]) {
    const o = new Builder();
    o.add(G.cyl(0.035, 0.035, 2.2, 8), WOOD_L, { p: [sx * 1.0, 0, 0], r: [0, 0, Math.PI / 2] });
    o.add(G.box(0.5, 0.03, 0.18, 0.02), WOOD, { p: [sx * 2.0, 0, 0] });
    const oar = new THREE.Mesh(o.build(), m.hull);
    oar.position.set(sx * 0.15, 0.48, -0.1);
    body.add(oar);
    oars.push(oar);
  }
}

export default fiche('NAV-002', 'barque', caracteristiques.name, boat('barque', () => construire('barque', caracteristiques, dessin)), { tags: ['monture', 'animé'] });
