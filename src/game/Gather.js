// Récolte et usage des outils : couper, miner, cueillir, creuser (terrassement par
// pas de 0,5 m), replanter, pêcher (mini-jeu doux), attraper des insectes au filet.
// Les outils n'ont pas d'usure ; hache et pioche servent automatiquement (le meilleur
// du sac), pelle, canne, filet et pousses se choisissent dans la barre rapide.
import * as THREE from 'three';
import { Builder, G } from '../scene/builder.js';
import { toonMaterial } from '../shaders/materials.js';
import { ITEMS } from '../data/items.js';
import { HARVEST, TOOL_NAMES, TIER_NAMES, strikeTime, rollDrops, flowerItemFor, rollFish, rollBug } from '../data/harvest.js';
import { BIOMES } from '../world/biomes.js';
import { groundAt, waterDepth, blockedByObstacle, isHome, projectCurved } from './navigation.js';
import { h, replay } from '../ui/dom.js';
import { kindModel } from '../world/models.js';
import { STRIDE } from '../world/islandgen.js';
import { BLOOM_IDS } from '../world/gen/zones.js';

const POSE = { hache: 'chop', pioche: 'mine', pelle: 'dig' };

// ---------------------------------------------------------------------------
// Outils tenus en main
const toolCache = new Map();
let toolMat = null;
function toolMesh(id) {
  const it = ITEMS[id];
  if (!it?.tool) return null;
  if (toolCache.has(id)) return toolCache.get(id);
  toolMat ||= toonMaterial({ vertexColors: true, aId: true, rim: 0.8 });
  const b = new Builder();
  const head = it.color;
  const wood = '#b98a64';
  if (it.tool === 'hache') {
    b.add(G.cyl(0.018, 0.02, 0.5, 6), wood, { p: [0, -0.2, 0] });
    b.add(G.box(0.03, 0.12, 0.14, 0.02), head, { p: [0, -0.42, 0.07] });
  } else if (it.tool === 'pioche') {
    b.add(G.cyl(0.018, 0.02, 0.5, 6), wood, { p: [0, -0.2, 0] });
    b.add(G.cone(0.03, 0.18, 6), head, { p: [0, -0.43, 0.09], r: [Math.PI / 2, 0, 0] });
    b.add(G.cone(0.03, 0.18, 6), head, { p: [0, -0.43, -0.09], r: [-Math.PI / 2, 0, 0] });
  } else if (it.tool === 'pelle') {
    b.add(G.cyl(0.018, 0.02, 0.55, 6), wood, { p: [0, -0.22, 0] });
    b.add(G.box(0.14, 0.18, 0.02, 0.02), head, { p: [0, -0.56, 0] });
  } else if (it.tool === 'canne') {
    b.add(G.cyl(0.01, 0.018, 1.1, 6), wood, { p: [0, -0.5, 0] });
    b.add(G.sphere(0.04, 8, 6), head, { p: [0, -0.05, 0.03] });
  } else {
    b.add(G.cyl(0.015, 0.018, 0.6, 6), wood, { p: [0, -0.28, 0] });
    b.add(G.torus(0.12, 0.012, 5, 16), head, { p: [0, -0.68, 0], r: [0, Math.PI / 2, 0] });
    b.add(G.sphere(0.12, 10, 6), '#fffaf0', { p: [0, -0.7, 0], s: [0.3, 1, 1] });
  }
  const m = new THREE.Mesh(b.build(), toolMat);
  m.rotation.set(-1.3, 0, 0);
  m.position.set(0, -0.02, 0.02);
  toolCache.set(id, m);
  return m;
}

export class Gather {
  constructor(game) {
    this.game = game;
    this.target = null;
    this.scanT = 0;
    this.busy = null;
    this.fishing = null;
    this.regrowT = 2;
    this.rng = Math.random;
    this.planted = [];
    const st = game.state;
    st.harvest ||= {};
    st.terra ||= {};
    st.planted ||= [];
    st.collections ||= { poissons: {}, insectes: {} };
    this.saplingMat = null;
    for (const p of st.planted) this.spawnPlanted(p);
  }

  get inv() {
    return this.game.inv;
  }

  selectedItem() {
    const s = this.inv.slots[this.game.state.sel || 0];
    return s ? ITEMS[s.id] : null;
  }

  // l'objet en main suit la case choisie (ou l'outil utilisé)
  refreshHeld(forceId = null) {
    const it = forceId ? ITEMS[forceId] : this.selectedItem();
    const mesh = it?.tool ? toolMesh(it.id) : null;
    if (this.game.character.held !== mesh) this.game.character.holdItem(mesh);
  }

  // ---------------------------------------------------------------------------
  update(dt) {
    const g = this.game;
    this.updateBusy(dt);
    this.updateFishing(dt);
    this.updatePlanted(dt);
    this.regrowT -= dt;
    if (this.regrowT <= 0) {
      this.regrowT = 3;
      this.regrow();
    }
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.15;
      this.target = this.busy || this.fishing || g.sailing?.aboard && this.selectedItem()?.tool !== 'canne' ? null : this.findTarget();
    }
  }

  // point devant le joueur
  ahead(dist) {
    const P = this.game.player;
    return { x: P.pos.x + Math.sin(P.facing) * dist, z: P.pos.z + Math.cos(P.facing) * dist };
  }

  findTarget() {
    const g = this.game;
    const P = g.player;
    if (P.mode !== 'free' && P.mode !== 'goto' && P.mode !== 'boat') return null;
    const sel = this.selectedItem();
    const tool = sel?.tool;
    if (tool === 'canne') {
      if (g.sailing?.aboard) {
        const a = this.ahead(4);
        return { mode: 'fish', x: a.x, z: a.z, label: 'Lancer la ligne', item: sel };
      }
      for (const d of [3, 4.5, 6]) {
        const a = this.ahead(d);
        if (waterDepth(a.x, a.z) > 0.7) return { mode: 'fish', x: a.x, z: a.z, label: 'Lancer la ligne', item: sel };
      }
      return null;
    }
    if (P.mode === 'boat' || P.swimming) return null;
    if (tool === 'pelle') {
      const a = this.ahead(1.1);
      if (waterDepth(a.x, a.z) > 0.25) return null;
      const v = g.islands.vertexAt(a.x, a.z);
      const gy = groundAt(a.x, a.z).y;
      if (!v && isHome(a.x, a.z) && gy > 0.85) return null; // l'île de départ : seulement la plage
      return { mode: 'dig', x: a.x, z: a.z, v, y: gy, label: g.input.run ? 'Remblayer (Maj)' : 'Creuser', item: sel };
    }
    if (tool === 'filet') {
      return { mode: 'net', x: P.pos.x, z: P.pos.z, label: 'Coup de filet', item: sel };
    }
    if (sel?.plant) {
      const a = this.ahead(1.4);
      const gy = groundAt(a.x, a.z).y;
      if (waterDepth(a.x, a.z) > 0.05 || gy < 0.9 || blockedByObstacle(a.x, a.z, 0.8)) return null;
      return { mode: 'plant', x: a.x, z: a.z, y: gy, label: 'Planter la pousse', item: sel };
    }
    // récolte : l'élément le plus proche, de préférence devant soi
    const fx = Math.sin(P.facing);
    const fz = Math.cos(P.facing);
    let best = null;
    for (const c of g.islands.itemsNear(P.pos.x, P.pos.z, 2.6)) {
      const def = HARVEST[c.kind];
      if (!def) continue;
      const dx = c.x - P.pos.x;
      const dz = c.z - P.pos.z;
      const dl = Math.hypot(dx, dz) || 1;
      const front = (dx * fx + dz * fz) / dl;
      // herbes, fleurs des champs, roseaux : seulement juste devant soi (pas d'invite permanente en prairie)
      if (c.ref?.tile && (c.d > 1.4 || front < 0.35)) continue;
      const minor = c.kind === 'herbe' ? 1.4 : c.kind === 'fleurs' || c.kind === 'fleur_champ' ? 0.5 : 0;
      const score = c.d - front * 0.8 + minor;
      if (!best || score < best.score) best = { ...c, def, score };
    }
    for (const p of this.planted) {
      if (p.grow < 1) continue;
      const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
      if (d < 2.4 && (!best || d - 0.5 < best.score)) best = { planted: p, kind: p.kind, def: HARVEST[p.kind], x: p.x, z: p.z, y: p.y, d, score: d - 0.5 };
    }
    if (!best) return null;
    const def = best.def;
    let label = def.verb;
    if (def.tool) {
      const t = this.inv.bestTool(def.tool);
      if (!t) label = `${def.verb} — il faut ${TOOL_NAMES[def.tool]}`;
      else if (t.tier < def.tier) label = `${def.verb} — il faut ${TOOL_NAMES[def.tool]} ${TIER_NAMES[def.tier]}`;
    }
    return { mode: 'harvest', ...best, label };
  }

  // position de l'invite (au-dessus de la cible)
  promptPos() {
    const t = this.target;
    if (!t) return null;
    const y = t.mode === 'harvest' ? (t.y ?? 0) + (t.def.tool === 'hache' ? 2.2 : 1.1) : groundAt(t.x, t.z).y + 1.2;
    return { x: t.x, y, z: t.z };
  }

  // ---------------------------------------------------------------------------
  act() {
    const t = this.target;
    if (!t || this.busy) return false;
    if (t.mode === 'harvest') return this.harvest(t);
    if (t.mode === 'dig') return this.dig(t);
    if (t.mode === 'plant') return this.plant(t);
    if (t.mode === 'fish') return this.startFishing(t);
    if (t.mode === 'net') return this.swingNet(t);
    return false;
  }

  harvest(t) {
    const g = this.game;
    const def = t.def;
    let tier = 1;
    let toolId = null;
    if (def.tool) {
      const tool = this.inv.bestTool(def.tool);
      if (!tool || tool.tier < def.tier) {
        g.ui.toast(`Il te faut ${TOOL_NAMES[def.tool]} ${TIER_NAMES[def.tier]} au moins.`, { icon: 'leaf' });
        g.audio?.pop(0.7);
        return true;
      }
      tier = tool.tier;
      toolId = tool.id;
    }
    const strikes = Math.max(1, Math.round(def.strikes - (tier - 1) * 0.6));
    const dur = def.tool ? strikes * strikeTime(tier) : 0.55;
    const pose = def.tool ? POSE[def.tool] : 'pickup';
    g.player.faceTowards(t.x, t.z);
    if (toolId) this.refreshHeld(toolId);
    this.busy = { t: 0, dur, strikes, tool: def.tool, target: t, nextStrike: def.tool ? strikeTime(tier) * 0.55 : 99 };
    g.player.playAction(pose, dur, () => this.finishHarvest(t, tier));
    return true;
  }

  finishHarvest(t, tier) {
    const g = this.game;
    this.busy = null;
    this.refreshHeld();
    let flower = null;
    if (t.kind === 'fleurs' && t.e) {
      const cols = BIOMES[t.e.desc.biome].flowers;
      flower = flowerItemFor(cols[Math.floor(t.variant * 997) % cols.length]);
    }
    // fleurs des champs : la couleur de la bande où on les cueille
    if (t.kind === 'fleur_champ') flower = `fleur_${BLOOM_IDS[Math.floor(t.variant * 5) % 5]}`;
    const drops = rollDrops(t.def, this.rng, { flower, bonus: tier >= 3 ? 1 : 0 });
    this.giveAll(drops);
    // l'élément disparaît et repoussera
    if (t.planted) {
      this.removePlanted(t.planted);
    } else if (t.e) {
      // identifiant stable : la récolte survit aux évolutions du générateur
      g.islands.setItemVisible(t.e, t.ref, false);
      const map = (g.state.harvest[t.e.desc.id] ||= {});
      map[t.id] = Date.now();
    }
    g.audio?.pop(1.25);
    g.pad?.rumble(0.55, 0.35, 140);
    g.markDirty();
    g.onHarvest?.(t.kind, drops);
  }

  giveAll(drops) {
    const g = this.game;
    let lost = 0;
    for (const [id, n] of Object.entries(drops)) {
      const left = this.inv.add(id, n);
      lost += left;
      if (n - left > 0) g.ui.pickup?.(id, n - left);
    }
    if (lost) g.ui.toast('Ton sac est plein : fais de la place (I) ou vends au marchand.', { icon: 'leaf' });
  }

  updateBusy(dt) {
    const b = this.busy;
    if (!b) return;
    b.t += dt;
    if (b.t >= b.nextStrike && b.tool) {
      b.nextStrike += b.dur / b.strikes;
      const a = this.game.audio;
      if (b.tool === 'hache') a?.chop();
      else if (b.tool === 'pioche') a?.mine();
      else a?.dig();
      // l'élément frappé tressaille
      const t = b.target;
      if (t?.e?.items && t.ref && !t.ref.tile) this.wiggle(t);
    }
    if (b.t > b.dur + 1) this.busy = null;
  }

  wiggle(t) {
    const ctx = t.e.items;
    const idx = t.ref.idx;
    const rec = ctx.kinds.get(t.e.plan.items[idx * STRIDE]);
    if (!rec) return;
    const i = ctx.slotOf.get(idx);
    const m = new THREE.Matrix4();
    rec.meshes[0].getMatrixAt(i, m);
    const s = new THREE.Matrix4().makeScale(1.06, 0.94, 1.06);
    const orig = m.clone();
    for (const im of rec.meshes) {
      im.setMatrixAt(i, m.clone().multiply(s));
      im.instanceMatrix.needsUpdate = true;
    }
    setTimeout(() => {
      if (!t.e.items || t.e.hidden.has(idx)) return;
      for (const im of rec.meshes) {
        im.setMatrixAt(i, orig);
        im.instanceMatrix.needsUpdate = true;
      }
    }, 110);
  }

  // repousse : les éléments récoltés reviennent après leur délai
  regrow() {
    const g = this.game;
    const now = Date.now();
    for (const [id, map] of Object.entries(g.state.harvest)) {
      const e = g.islands.entries.get(id);
      // île pas chargée : on décidera à son retour (on connaîtra alors l'espèce)
      if (!e?.items) continue;
      for (const [idS, t] of Object.entries(map)) {
        const id = Number(idS);
        const kind = g.islands.kindOfId(e, id);
        if (!kind) continue;
        const def = HARVEST[kind];
        if (now - t < (def?.regrow ?? 600) * 1000) continue;
        delete map[idS];
        g.islands.setItemVisibleById(e, id, true);
      }
      if (!Object.keys(map).length) delete g.state.harvest[id];
    }
  }

  // ---------------------------------------------------------------------------
  // Pelle : creuser donne du sable (plage) ou de l'argile ; Maj + pelle remblaie
  dig(t) {
    const g = this.game;
    const raise = g.input.run;
    const sandy = t.y < 1.4;
    const res = sandy ? 'sable' : 'argile';
    if (t.v) {
      const key = `${t.v.i},${t.v.j}`;
      const diffs = (g.state.terra[t.v.e.desc.id] ||= {});
      const cur = diffs[key] || 0;
      if (raise) {
        if (cur >= 1) return this.say('On ne peut pas monter plus haut ici (1 m).');
        if (!this.inv.remove('sable', 1) && !this.inv.remove('argile', 1)) return this.say('Il faut du sable ou de l\'argile pour remblayer.');
      } else if (cur <= -1) return this.say('C\'est déjà bien creusé ici (1 m).');
      const d = raise ? 0.5 : -0.5;
      g.player.faceTowards(t.x, t.z);
      this.busy = { t: 0, dur: 0.9, strikes: 2, tool: 'pelle', nextStrike: 0.4 };
      g.player.playAction('dig', 0.9, () => {
        this.busy = null;
        diffs[key] = cur + d;
        if (diffs[key] === 0) delete diffs[key];
        // la surface lit ces différences en direct
        t.v.e.surf.terra = diffs;
        t.v.e.surf.terraCount = Object.keys(diffs).length || 1;
        g.islands.terraform(t.v.e, t.v.i, t.v.j);
        if (!raise) this.giveAll({ [res]: 1 });
        g.onDig?.(t.x, t.z);
        g.markDirty();
      });
      return true;
    }
    // île de départ : on prend du sable sur la plage, sans changer le relief dessiné
    this.busy = { t: 0, dur: 0.9, strikes: 2, tool: 'pelle', nextStrike: 0.4 };
    g.player.faceTowards(t.x, t.z);
    g.player.playAction('dig', 0.9, () => {
      this.busy = null;
      if (!raise) this.giveAll({ sable: 1 });
      g.onDig?.(t.x, t.z);
    });
    return true;
  }

  say(text) {
    this.game.ui.toast(text, { icon: 'leaf' });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Replanter : une pousse devient un arbre en quelques minutes
  plant(t) {
    const g = this.game;
    if (!this.inv.remove('pousse', 1)) return false;
    const biome = g.islands.entryAt(t.x, t.z)?.desc.biome;
    const kind = { pins: 'pin', glace: 'pin_givre', tropical: 'palmier', atoll: 'palmier', dunes: 'arbre_pompon', champignons: 'champi_geant' }[biome] || (this.rng() < 0.3 ? 'arbre_fruitier' : 'arbre_pompon');
    const p = { x: t.x, z: t.z, kind, t: Date.now() };
    g.state.planted.push(p);
    this.spawnPlanted(p);
    g.player.playAction('dig', 0.7, () => {});
    g.audio?.plop();
    g.markDirty();
    return true;
  }

  spawnPlanted(p) {
    const g = this.game;
    const model = kindModel(p.kind);
    const group = new THREE.Group();
    group.position.set(p.x, groundAt(p.x, p.z).y - 0.04, p.z);
    group.rotation.y = (p.x * 13.1 + p.z * 7.7) % 6.28;
    if (model.solid) group.add(new THREE.Mesh(model.solid, g.islands.mats.solid));
    if (model.clumpGeo) group.add(new THREE.Mesh(model.clumpGeo, g.islands.mats.foliage));
    g.scene.add(group);
    const rec = { ...p, y: group.position.y, group, grow: 0, src: p };
    this.planted.push(rec);
    this.growPlanted(rec);
  }

  growPlanted(rec) {
    const age = (Date.now() - rec.t) / 1000;
    rec.grow = Math.min(1, age / 360);
    const s = 0.25 + rec.grow * 0.75;
    rec.group.scale.set(s, s, s);
  }

  updatePlanted(dt) {
    this.growT = (this.growT || 0) - dt;
    if (this.growT > 0) return;
    this.growT = 2;
    for (const p of this.planted) if (p.grow < 1) this.growPlanted(p);
  }

  removePlanted(rec) {
    const g = this.game;
    g.scene.remove(rec.group);
    this.planted.splice(this.planted.indexOf(rec), 1);
    const i = g.state.planted.indexOf(rec.src);
    if (i >= 0) g.state.planted.splice(i, 1);
  }

  // ---------------------------------------------------------------------------
  // Pêche : on lance, on attend, ça mord, on ferre quand le curseur est dans la zone
  startFishing(t) {
    const g = this.game;
    const tier = t.item.tier;
    if (!g.sailing.aboard) {
      g.player.faceTowards(t.x, t.z);
      g.player.mode = 'action';
      g.player.action = { pose: 'fish', t: 0, duration: 1e9, onEnd: null };
      g.player.vel.set(0, 0, 0);
    }
    g.character.setPose('fish');
    this.refreshHeld(t.item.id);
    // appât : ça mord plus vite
    const bait = this.inv.remove('appat', 1);
    this.fishing = { x: t.x, z: t.z, tier, phase: 'wait', t: 0, wait: (bait ? 1.5 : 2.5) + this.rng() * (bait ? 2.5 : 4.5), tries: 3, bait };
    this.bobber ||= this.makeBobber();
    this.bobber.position.set(t.x, 0.05, t.z);
    this.bobber.visible = true;
    g.audio?.splash?.(0.3);
    return true;
  }

  makeBobber() {
    const b = new Builder();
    b.add(G.sphere(0.09, 10, 8), '#f4a28c', { p: [0, 0.04, 0] });
    b.add(new THREE.SphereGeometry(0.092, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#fffaf0', { p: [0, 0.05, 0] });
    b.add(G.cyl(0.01, 0.01, 0.12, 5), '#5b4a63', { p: [0, 0.16, 0] });
    const m = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, aId: true, rim: 0.5 }));
    this.game.scene.add(m);
    return m;
  }

  updateFishing(dt) {
    const f = this.fishing;
    if (!f) return;
    const g = this.game;
    f.t += dt;
    const bob = this.bobber;
    const t = performance.now() / 1000;
    if (f.phase === 'wait') {
      bob.position.y = 0.04 + Math.sin(t * 2.4) * 0.03;
      if (f.t > f.wait) {
        f.phase = 'bite';
        f.t = 0;
        g.character.bite = true;
        g.audio?.plop();
        // ça mord : une secousse dans les mains
        g.pad?.rumble(0.85, 0.3, 240);
        this.openFishGame(f);
      }
    } else if (f.phase === 'bite') {
      bob.position.y = -0.05 + Math.sin(t * 18) * 0.04;
      const k = (Math.sin(f.t * (2.2 + f.tries * 0.15)) + 1) / 2;
      f.cursor = k;
      if (this.fishUI) this.fishUI.cursor.style.left = `${(k * 100).toFixed(1)}%`;
    }
    // on s'éloigne : la ligne se détend
    if (!g.sailing.aboard && g.player.mode !== 'action') this.stopFishing();
  }

  openFishGame(f) {
    const g = this.game;
    const width = 0.3 + f.tier * 0.06 + (f.bait ? 0.05 : 0);
    f.zone = [0.5 - width / 2 + (this.rng() - 0.5) * 0.3, 0];
    f.zone[1] = f.zone[0] + width;
    const zone = h('span', { class: 'fish-zone', style: `left:${(f.zone[0] * 100).toFixed(0)}%;width:${(width * 100).toFixed(0)}%` });
    const cursor = h('span', { class: 'fish-cursor' });
    const tries = h('span', { class: 'fish-tries' }, '● ● ●');
    const el = h('div', { class: 'fish-game paper', role: 'dialog', 'aria-label': 'Ça mord !' },
      h('b', {}, 'Ça mord !'),
      h('span', { class: 'muted' }, `Appuie sur ${g.pad?.recent ? '✕' : 'E'} quand le flotteur est dans la zone verte`),
      h('div', { class: 'fish-bar' }, zone, cursor), tries);
    g.uiRoot.append(el);
    this.fishUI = { el, cursor, tries };
  }

  // E pendant la pêche : ferrer (ou relancer après une prise)
  strike() {
    const f = this.fishing;
    if (!f) return false;
    if (f.phase !== 'bite') return true;
    const g = this.game;
    if (f.cursor >= f.zone[0] && f.cursor <= f.zone[1]) {
      const near = g.islands.nearest(g.player.pos.x, g.player.pos.z);
      const biome = near && near.d < 120 ? near.desc.biome : Math.hypot(g.player.pos.x, g.player.pos.z) < 150 ? 'prairie' : 'large';
      const large = (!near || near.d > 150) && Math.hypot(f.x, f.z) > 200;
      const id = rollFish(this.rng, { biome, large, tier: f.tier });
      this.catch(id, 'poissons');
      this.stopFishing();
      return true;
    }
    f.tries--;
    g.audio?.pop(0.6);
    if (this.fishUI) {
      this.fishUI.tries.textContent = '● '.repeat(f.tries).trim() + ' ○'.repeat(3 - f.tries);
      replay(this.fishUI.el, 'shake');
    }
    if (f.tries <= 0) {
      g.ui.toast('Il s\'est échappé… Ce sera pour la prochaine fois !', { icon: 'leaf' });
      this.stopFishing();
    }
    return true;
  }

  stopFishing() {
    const g = this.game;
    this.fishing = null;
    g.character.bite = false;
    if (this.bobber) this.bobber.visible = false;
    this.fishUI?.el.remove();
    this.fishUI = null;
    if (g.player.mode === 'action' && g.player.action?.pose === 'fish') {
      g.player.mode = 'free';
      g.player.action = null;
      g.character.setPose('idle');
    }
    if (g.sailing.aboard) g.character.setPose(g.sailing.spec.sail ? 'steer' : 'row');
    this.refreshHeld();
  }

  // collection : première prise notée dans le journal
  catch(id, col) {
    const g = this.game;
    const book = g.state.collections[col];
    const first = !book[id];
    book[id] = { n: (book[id]?.n || 0) + 1, first: book[id]?.first || Date.now() };
    this.giveAll({ [id]: 1 });
    g.character.setPose('celebrate');
    setTimeout(() => g.character.pose === 'celebrate' && g.character.setPose(g.sailing.aboard ? (g.sailing.spec.sail ? 'steer' : 'row') : 'idle'), 1100);
    g.ui.toast(first ? `Nouveau dans ta collection : ${ITEMS[id].name} !` : `${ITEMS[id].name} !`, { icon: 'sparkle', duration: first ? 4200 : 2400 });
    g.audio?.coin();
    g.markDirty();
  }

  // Filet : un coup de filet près des fleurs (ou sur la plage pour les bernard-l'ermite)
  swingNet(t) {
    const g = this.game;
    const tier = t.item.tier;
    const P = g.player.pos;
    const night = (g.world.dayCycle.hour >= 20 || g.world.dayCycle.hour < 5.5);
    const beach = groundAt(P.x, P.z).y < 1.3;
    const flowers = g.islands.itemsNear(P.x, P.z, 5).filter((c) => c.kind === 'fleurs' || c.kind === 'fleur_champ' || c.kind === 'herbe').length + (isHome(P.x, P.z) ? 4 : 0);
    this.refreshHeld(t.item.id);
    this.busy = { t: 0, dur: 0.8, strikes: 0, nextStrike: 99 };
    g.player.playAction('chop', 0.8, () => {
      this.busy = null;
      this.refreshHeld();
      const chance = Math.min(0.85, 0.25 + Math.min(flowers, 8) * 0.05 + tier * 0.06 + (beach ? 0.2 : 0));
      if (this.rng() < chance) this.catch(rollBug(this.rng, { night, beach, tier }), 'insectes');
      else g.ui.toast(beach ? 'Rien sous les galets cette fois.' : 'Raté ! Les insectes aiment les coins fleuris.', { icon: 'leaf', duration: 2000 });
    });
    return true;
  }
}

