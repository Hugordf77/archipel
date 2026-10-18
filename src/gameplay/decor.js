import * as THREE from 'three';
import { U, ORIGIN } from '../core/globals.js';
import { groundAt, blockedByObstacle, waterDepth, addObstacle, removeObstacle, pickGround } from '../world/navigation.js';
import { uid } from '../core/state.js';
import { ITEMS } from '../data/items.js';
import { CATALOG, CATALOG_ORDER } from '../models/decor/index.js';
export { CATALOG, CATALOG_ORDER };

export function nearbyStations(decor, x, z, radius = 5.5) {
  const near = new Set(['main']);
  for (const d of decor || []) {
    const station = CATALOG[d.type]?.station;
    if (station && Math.hypot(x - d.x, z - d.z) <= radius) near.add(station);
  }
  return near;
}

// ---------------------------------------------------------------------------
// Gestionnaire : objets posés + mode placement
// ---------------------------------------------------------------------------
export class Decor {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'decorations';
    game.scene.add(this.group);
    this.views = new Map();
    this.placing = null;
    this.t = 0;
    const ring = new THREE.RingGeometry(0.85, 1.0, 32);
    ring.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0x9fdcc8, transparent: true, opacity: 0.85, depthWrite: false }));
    this.ring.visible = false;
    game.overlayScene.add(this.ring);
  }

  sync() {
    const list = this.game.state.decor;
    const alive = new Set(list.map((d) => d.id));
    for (const [id, v] of this.views) {
      if (!alive.has(id)) this.removeView(id);
    }
    for (const d of list) if (!this.views.has(d.id)) this.addView(d);
  }

  addView(d) {
    const def = CATALOG[d.type];
    if (!def) return;
    const obj = def.build();
    const y = groundAt(d.x, d.z).y;
    obj.position.set(d.x, y, d.z);
    obj.rotation.y = d.rot || 0;
    this.group.add(obj);
    const obstacle = def.r > 0.3 ? addObstacle({ x: d.x, z: d.z, r: def.r }) : null;
    this.game.interactions.add({
      id: `decor_${d.id}`,
      pos: new THREE.Vector3(d.x, y + 1.3, d.z),
      approach: { x: d.x, z: d.z + def.r + 0.6 },
      radius: def.r + 1.2,
      priority: -0.2,
      label: `Déplacer : ${def.name.toLowerCase()}`,
      enabled: () => this.game.mode !== 'focus' && !this.placing,
      action: () => this.pickUp(d),
    });
    this.views.set(d.id, { obj, obstacle, def });
  }

  removeView(id) {
    const v = this.views.get(id);
    if (!v) return;
    this.group.remove(v.obj);
    if (v.obstacle) removeObstacle(v.obstacle);
    this.game.interactions.remove(`decor_${id}`);
    this.views.delete(id);
  }

  // --- placement ---
  startPlacement(type, existing = null) {
    this.cancelPlacement(true);
    const def = CATALOG[type];
    if (!def) return false;
    if (!existing && ITEMS[type]?.station && !this.game.inv.has({ [type]: 1 })) {
      this.game.ui.toast(`Il te faut ${ITEMS[type].name.toLowerCase()} dans ton sac.`, { icon: 'leaf' });
      return false;
    }
    const ghost = def.build();
    this.game.scene.add(ghost);
    this.placing = { type, def, ghost, rot: existing?.rot || 0, existing, valid: false, x: 0, z: 0 };
    this.ring.visible = true;
    this.ring.scale.setScalar(Math.max(0.5, def.r + 0.2));
    this.game.ui.setHint('Clic : poser · R : tourner · Échap : annuler · Suppr : ranger dans l\'inventaire');
    this.game.mode = this.game.mode === 'focus' ? 'focus' : 'free';
  }

  pickUp(d) {
    // Retire seulement la vue pendant le placement. La sauvegarde garde
    // l'ancien emplacement jusqu'à la validation du nouveau.
    this.removeView(d.id);
    this.startPlacement(d.type, d);
    this.game.audio?.pop(0.8);
  }

  cancelPlacement(silent = false) {
    if (!this.placing) return;
    const p = this.placing;
    this.game.scene.remove(p.ghost);
    this.ring.visible = false;
    this.placing = null;
    if (p.existing) {
      // La position sauvegardée d'origine est restée en place pendant le ghost.
      if (!this.game.state.decor.some((d) => d.id === p.existing.id)) this.game.state.decor.push(p.existing);
      this.sync();
    }
    if (!silent) this.game.ui.toast('Placement annulé.', { icon: 'shop' });
  }

  storePlacement() {
    if (!this.placing) return;
    const p = this.placing;
    if (p.existing && ITEMS[p.type]?.station && this.game.inv.room(p.type) < 1) {
      this.game.ui.toast('Ton sac est plein : impossible de ranger cette station.', { icon: 'leaf' });
      return;
    }
    this.game.scene.remove(p.ghost);
    this.ring.visible = false;
    this.placing = null;
    // un objet repris au sol retourne dans l'inventaire ; un objet neuf y est déjà
    const inv = this.game.state.inventory;
    if (p.existing) {
      this.game.state.decor = this.game.state.decor.filter((d) => d.id !== p.existing.id);
      if (ITEMS[p.type]?.station) this.game.inv.add(p.type, 1);
      else inv[p.type] = (inv[p.type] || 0) + 1;
    }
    this.game.markDirty();
    this.game.ui.toast(`${p.def.name} rangé dans l'inventaire.`, { icon: 'shop' });
  }

  rotate() {
    if (this.placing) this.placing.rot += Math.PI / 4;
  }

  isValid(x, z, r) {
    const g = groundAt(x, z);
    if (g.deck || waterDepth(x, z) > 0.02 || g.y < 0.1) return false;
    if (blockedByObstacle(x, z, r * 0.8)) return false;
    const e = 0.5;
    if (Math.abs(groundAt(x + e, z).y - groundAt(x - e, z).y) > 0.35) return false;
    if (Math.abs(groundAt(x, z + e).y - groundAt(x, z - e).y) > 0.35) return false;
    const pl = this.game.player.pos;
    if (Math.hypot(pl.x - x, pl.z - z) < r + 0.25) return false;
    return true;
  }

  place() {
    const p = this.placing;
    if (!p || !p.valid) {
      this.game.audio?.pop(0.5);
      return false;
    }
    const inv = this.game.state.inventory;
    if (!p.existing) {
      if (ITEMS[p.type]?.station) {
        if (!this.game.inv.remove(p.type, 1)) return false;
      } else inv[p.type] = Math.max(0, (inv[p.type] || 0) - 1);
    }
    const rec = { id: p.existing?.id || uid('dc'), type: p.type, x: +p.x.toFixed(2), z: +p.z.toFixed(2), rot: p.rot };
    this.game.scene.remove(p.ghost);
    this.ring.visible = false;
    this.placing = null;
    const existingIndex = p.existing ? this.game.state.decor.findIndex((d) => d.id === p.existing.id) : -1;
    if (existingIndex >= 0) this.game.state.decor[existingIndex] = rec;
    else this.game.state.decor.push(rec);
    this.sync();
    const v = this.views.get(rec.id);
    if (v) v.pop = 1;
    this.game.markDirty();
    this.game.audio?.pop(1.2);
    this.game.character.bounce(1);
    return true;
  }

  update(dt, pointer, camera) {
    this.t += dt;
    for (const v of this.views.values()) {
      v.obj.userData.anim?.(dt, this.t);
      if (v.pop > 0) {
        v.pop = Math.max(0, v.pop - dt * 2.2);
        const k = Math.sin(v.pop * Math.PI * 2) * v.pop * 0.25;
        v.obj.scale.set(1 + k, 1 - k, 1 + k);
      }
      v.obj.traverse((o) => {
        if (o.userData.halo) o.material.uniforms.uIntensity.value = this.game.world ? Math.min(1, Math.max(0, (o.material.uniforms.uNight?.value ?? 0))) * 0.8 : 0;
      });
    }
    const p = this.placing;
    if (!p) return;
    const ndc = new THREE.Vector2((pointer.x / window.innerWidth) * 2 - 1, -(pointer.y / window.innerHeight) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, camera);
    const hit = pickGround(rc);
    if (hit) {
      p.x = hit.x;
      p.z = hit.z;
    }
    const y = groundAt(p.x, p.z).y;
    p.valid = this.isValid(p.x, p.z, p.def.r);
    p.ghost.position.set(p.x, y + 0.08 + Math.abs(Math.sin(this.t * 4)) * 0.06, p.z);
    p.ghost.rotation.y += (p.rot - p.ghost.rotation.y) * Math.min(1, dt * 12);
    const o = U.uCurveOrigin.value;
    const cd = U.uCurveDir.value;
    const along = Math.max((p.x - ORIGIN.x - o.x) * cd.x + (p.z - ORIGIN.z - o.z) * cd.y, 0);
    this.ring.position.set(p.x - ORIGIN.x, y + 0.05 - U.uCurvature.value * along * along, p.z - ORIGIN.z);
    this.ring.material.color.set(p.valid ? 0x9fdcc8 : 0xf4a28c);
    p.ghost.userData.anim?.(dt, this.t);
  }
}
