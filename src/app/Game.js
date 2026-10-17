import * as THREE from 'three';
import { World } from '../world/World.js';
import { Pipeline } from '../render/Pipeline.js';
import { U, CHAR_IDS, ORIGIN } from '../core/globals.js';
import { IslandManager } from '../world/islands/IslandManager.js';
import { IslandFauna } from '../entities/fauna/islandFauna.js';
import { ARCHETYPES } from '../world/islands/archetypes.js';
import { POI_LABELS } from '../world/islands/gen/pois.js';
import { mulberry32 } from '../core/random.js';
import { MarineManager } from '../world/marine.js';
import { Sailing } from '../entities/Sailing.js';
import { AirRide } from '../entities/AirRide.js';
import { BOATS } from '../entities/boats.js';
import { reveal } from '../world/fog.js';
import { BIOMES } from '../world/islands/biomes.js';
import { toonMaterial } from '../render/shaders/materials.js';
import { LAYOUT } from '../world/home/terrain.js';
import { Fauna } from '../entities/fauna/homeFauna.js';
import { CameraRig } from './CameraRig.js';
import { Input } from '../core/Input.js';
import { GamepadInput } from '../core/Gamepad.js';
import { LocoFeedback } from '../entities/locomotion/feedback.js';
import { Character } from '../entities/character/Character.js';
import { Player } from '../entities/Player.js';
import { Owl } from '../entities/Owl.js';
import { Interactions } from '../gameplay/Interactions.js';
import { Collectibles, KINDS } from '../gameplay/collectibles.js';
import { Inventory } from '../gameplay/Inventory.js';
import { Gather } from '../gameplay/Gather.js';
import { setObstacles, setBridge, pickGround, projectCurved, groundAt, addObstacle, blockedByObstacle, setWaterProvider, obstacleAt, waterDepth } from '../world/navigation.js';
import { loadSave, writeSave } from '../core/db.js';
import { migrate, todayKey, legacyHours, relinkDiscoveries } from '../core/state.js';
import { Decor, CATALOG, nearbyStations } from '../gameplay/decor.js';
import { UI } from '../ui/UI.js';
import { h } from '../ui/dom.js';
import { openShopPanel } from '../ui/shopPanel.js';
import { openLogbookPanel, openMapPanel, openCartographerPanel } from '../ui/explorePanels.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { Weather } from '../world/env/weather.js';
import { openSettingsPanel } from '../ui/settingsPanel.js';
import { Hotbar, openInventoryPanel } from '../ui/inventoryUI.js';
import { openMirrorPanel } from '../ui/mirrorPanel.js';
import { seasonOf, applySeason, seasonSnow } from '../world/env/season.js';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export class Game {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('#scene');
    this.uiRoot = root.querySelector('#ui');
    this.dirty = false;
    this.saveTimer = 0;
    this.clock = new THREE.Clock();
    this.mode = 'free';
    this._v = new THREE.Vector3();
    this._lf = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
  }

  async init() {
    // --- rendu ---
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.world = new World();
    // contenu du monde en coordonnées absolues (le groupe racine porte l'origine flottante)
    this.scene = this.world.root;
    this.pipeline = new Pipeline(this.renderer);
    this.rig = new CameraRig(this.camera);
    // cadrage de jeu par défaut
    this.defaultCam = { dist: 14, pitch: 0.56 };
    this.rig.distance = this.rig.cur.distance = this.defaultCam.dist;
    this.rig.pitch = this.rig.cur.pitch = this.defaultCam.pitch;
    this.rig.groundFn = (x, z) => groundAt(x, z).y;

    // --- sauvegarde ---
    this.state = migrate(await loadSave());
    this.audio = new AudioEngine(this.state.settings.volumes);

    // --- archipel : îles générées autour du joueur ---
    this.islands = new IslandManager({
      root: this.world.root,
      seed: this.state.world.seed,
      leafTex: this.world.leafTex,
      onDiscover: (desc) => this.discoverIsland(desc),
      // différences de sauvegarde : récoltes (identifiants stables) et terrassements
      hiddenItems: (id) => Object.keys(this.state.harvest?.[id] || {}),
      terraDiffs: (id) => this.state.terra?.[id] || null,
      onNear: (e, on) => this.onIslandNear(e, on),
      onPoi: (e, p) => this.discoverPoi(e, p),
    });
    setWaterProvider((x, z) => this.islands.waterLevelAt(x, z));
    this.relinkDiscoveries();
    for (const id of Object.keys(this.state.explorer.islands)) this.islands.discovered.add(id);
    for (const id of Object.keys(this.state.explorer.pois || {})) this.islands.seenPois.add(Number(id));

    // --- navigation ---
    setObstacles(this.world.obstacles);
    setBridge(this.world.spots.bridge);

    // --- personnages ---
    this.character = new Character(this.state.avatar);
    this.scene.add(this.character.root);
    // la poussière est calculée en coordonnées de scène (locales)
    this.world.scene.add(this.character.dust);
    this.world.scene.add(this.character.foam);
    this.player = new Player(this.character);
    const p = this.state.player;
    this.recenter(p.x, p.z);
    this.player.place(p.x, p.z, Math.PI);
    this.player.onStep = (surface, speed, pan) => this.audio?.step(surface, speed, pan);
    this.rig.target.copy(this.player.pos);
    this.rig.focus.copy(this.player.pos);

    // bateau du joueur et navigation
    this.sailing = new Sailing(this);
    this.airRide = new AirRide(this);

    this.owl = new Owl(this.world.spots.owl);
    this.scene.add(this.owl.root);
    this.fauna = new Fauna(this.scene);

    // --- interactions ---
    this.buildClickMarker();
    this.interactions = new Interactions();
    this.registerInteractions();
    this.collectibles = new Collectibles(this.scene, this.interactions, (item) => this.pickUp(item));
    // Éléments marins : streaming déterministe autour du joueur, séparé du
    // maillage des îles afin de rester léger en pleine mer.
    this.state.marine ||= { taken: [] };
    this.marine = new MarineManager({
      root: this.world.root,
      interactions: this.interactions,
      seed: this.state.world.seed,
      taken: this.state.marine.taken,
      onCollect: (item) => this.collectMarine(item),
    });

    // --- interface ---
    this.ui = new UI(this.uiRoot, this);
    this.ui.setShells(this.state.shells);
    // La récolte et l'inventaire étaient présents dans le projet mais n'étaient
    // pas encore connectés à la boucle principale.
    this.inv = new Inventory(this.state.bag);
    this.state.sel = Number.isInteger(this.state.sel) ? Math.max(0, Math.min(7, this.state.sel)) : 0;
    this.inv.onChange = () => {
      this.state.bag = this.inv.serialize();
      this.markDirty();
      this.hotbar?.render();
    };
    this.hotbar = new Hotbar(this);
    this.gather = new Gather(this);
    // faune des îles générées
    this.islands.fauna = new IslandFauna(this);
    this.fade = h('div', { class: 'paper-fade' });
    document.body.append(this.fade);

    // --- décorations, météo ---
    this.decor = new Decor(this);
    this.decor.sync();
    this.weather = new Weather(this.overlayScene);
    this.weather.setMode(this.state.settings.weather);
    this.refreshDay();
    this.updateProgressVisuals(false);

    // --- entrées ---
    this.input = new Input(this.canvas);
    // manette (DualSense, DualShock, Xbox…) : mêmes actions que le clavier
    this.pad = new GamepadInput(this);
    this.input.pad = this.pad;
    // sons, bouffées, vibrations et caméra de la locomotion
    this.locoFx = new LocoFeedback(this);
    this.onLocoEvent = (e) => this.locoFx.handle(e);
    this.input.onDrag = (dx, dy) => {
      // devant le miroir, on fait pivoter le personnage plutôt que la caméra
      if (this.mirror) this.player.facing += dx * 0.012;
      else {
        this.rig.rotate(-dx * 0.006, dy * 0.004);
        this.sailing.lastDrag = performance.now();
      }
    };
    this.input.onWheel = (d) => this.rig.zoom(d > 0 ? 1.08 : 0.93);
    this.input.onClick = (x, y) => this.handleClick(x, y);
    this.input.onKey = (code, e) => this.handleKey(code, e);

    this.applySettings();
    const wake = () => this.audio.resume();
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    this.uiRoot.addEventListener('click', (e) => {
      if (e.target.closest('button')) this.audio.pop(1.15);
    });
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('pagehide', () => this.saveNow());
    this.resize();

    this.state.launches = (this.state.launches || 0) + 1;
    this.markDirty();
    if (!this.state.intro) {
      this.state.intro = true;
      this.markDirty();
      setTimeout(() => this.ui.toast('Bienvenue sur ton île ! Marche avec ZQSD ou les flèches.', { icon: 'leaf', duration: 5200 }), 800);
      setTimeout(() => this.ui.toast('Le hibou cartographe t\'attend près de la bibliothèque : l\'archipel est à explorer.', { icon: 'owl', duration: 5600 }), 3400);
    }

    // une seule fois : le miroir pour choisir son apparence (fermable, rien de bloquant)
    if (!this.state.avatarIntro) {
      setTimeout(() => {
        if (!this.ui.panelOpen && !this.state.avatarIntro) this.openMirror({ first: true });
      }, this.state.launches <= 1 ? 6200 : 1200);
    }

    // les îles visibles depuis le départ sont prêtes avant le lever de rideau
    await this.islands.preload(this.player.pos.x, this.player.pos.z);
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('done');
      setTimeout(() => loading.remove(), 900);
    }
    if (import.meta.env.DEV) window.__ile = this.devTools();
  }

  // ---------------------------------------------------------------------------
  // Interactions du décor
  // ---------------------------------------------------------------------------
  registerInteractions() {
    const S = this.world.spots;
    const I = this.interactions;

    // table du cartographe (l'ancien bureau d'étude) : ouvre la carte
    const d = S.desk;
    I.add({
      id: 'desk',
      pos: new THREE.Vector3(d.x, d.seatY + 0.9, d.z + 0.9),
      approach: { x: d.x + 1.1, z: d.z + 0.1 },
      radius: 2.2,
      label: 'Consulter la carte',
      action: () => this.openMap(),
    });

    // banc près du bassin
    const bx = -5.2;
    const bz = -3.4;
    const by = groundAt(bx, bz).y;
    I.add({
      id: 'bench',
      pos: new THREE.Vector3(bx, by + 0.9, bz),
      approach: { x: bx + Math.sin(0.5) * 0.9, z: bz + Math.cos(0.5) * 0.9 },
      radius: 1.8,
      label: "S'asseoir sur le banc",
      action: () => this.player.sitAt({ x: bx, z: bz, y: by + 0.44, facing: 0.5, pose: 'sit', exit: { x: bx + Math.sin(0.5) * 1.0, z: bz + Math.cos(0.5) * 1.0 } }),
    });

    // bout du ponton
    const P = LAYOUT.pier;
    I.add({
      id: 'pier',
      pos: new THREE.Vector3(P.x, P.h + 0.8, P.z1 - 0.3),
      approach: { x: P.x, z: P.z1 - 0.9 },
      radius: 1.8,
      label: 'Contempler la mer',
      action: () => this.player.sitAt({ x: P.x, z: P.z1 - 0.15, y: P.h + 0.2, facing: 0, pose: 'dangle', exit: { x: P.x, z: P.z1 - 1.2 } }),
    });

    // le bateau : on embarque depuis la rive (ou à la nage)
    const boatItem = I.add({
      id: 'boat',
      pos: new THREE.Vector3(),
      radius: 4.2,
      priority: 0.6,
      label: () => `Embarquer (${BOATS[this.state.boat.type].name.toLowerCase()})`,
      enabled: () => !this.sailing?.aboard,
      action: () => this.sailing.board(),
    });
    this.boatItem = boatItem;
    // appeler le bateau au ponton de l'île de départ
    I.add({
      id: 'pier-recall',
      pos: new THREE.Vector3(P.x, P.h + 0.9, P.z0 + 3),
      approach: { x: P.x, z: P.z0 + 3 },
      radius: 1.6,
      label: 'Appeler le bateau',
      enabled: () => this.sailing && !this.sailing.aboard && this.sailing.distanceTo(P.x + 2.4, P.z1 - 1.6) > 25,
      action: () => this.recallBoat(P.x + 2.4, P.z1 - 1.6, 0),
    });

    // le hibou, cartographe de l'archipel
    const o = S.owl;
    I.add({
      id: 'owl',
      pos: o.perch.clone().add(new THREE.Vector3(0, 0.9, 0)),
      approach: { x: o.x, z: o.z },
      radius: 2.6,
      label: 'Parler au cartographe',
      action: () => this.openCartographer(),
    });

    // maison : le journal de bord
    const hs = S.house;
    I.add({
      id: 'house',
      pos: new THREE.Vector3(LAYOUT.house.x, groundAt(LAYOUT.house.x, LAYOUT.house.z).y + 2.0, LAYOUT.house.z + 2.1),
      approach: { x: hs.x, z: hs.z },
      radius: 2.0,
      label: 'Ouvrir le journal de bord',
      action: () => this.openJournal(),
    });

    // miroir près de la porte de la maison
    const mi = S.mirror;
    if (mi) {
      I.add({
        id: 'mirror',
        pos: new THREE.Vector3(mi.x, mi.y + 1.7, mi.z),
        approach: { x: mi.x + Math.sin(mi.rot) * 0.95, z: mi.z + Math.cos(mi.rot) * 0.95 },
        radius: 1.6,
        label: 'Se regarder dans le miroir',
        action: () => this.openMirror(),
      });
    }

    // échoppe
    const sh = S.shop;
    I.add({
      id: 'shop',
      pos: new THREE.Vector3(LAYOUT.shop.x, groundAt(LAYOUT.shop.x, LAYOUT.shop.z).y + 1.6, LAYOUT.shop.z),
      approach: { x: sh.x, z: sh.z },
      radius: 2.2,
      label: "L'échoppe : décos et vêtements",
      action: () => this.openShop(),
    });
  }

  // ---------------------------------------------------------------------------
  // Boucle principale
  // ---------------------------------------------------------------------------
  frame() {
    const rawDt = this.clock.getDelta();
    const dt = Math.min(0.05, rawDt);
    const st = this.state;
    this.fps = this.fps ? this.fps * 0.95 + (1 / Math.max(rawDt, 1e-3)) * 0.05 : 60;
    this.pipeline.adapt(rawDt * 1000);

    // joueur (mi-clos après 23 h)
    const hour = this.world.dayCycle.hour;
    this.character.sleepy = hour >= 23 || hour < 5;
    this.pad.poll(dt);
    this.sailing.update(dt, this.input);
    const intent = this.buildIntent();
    if (this.airRide.riding) this.airRide.update(dt, this.input);
    else this.player.update(dt, intent);
    this.consumeLocoEvents();
    this.locoFx?.update(dt);
    this.rig.followVelocity.copy(this.player.vel);
    this.rig.followSpeed = this.player.actualSpeed;
    this.rig.followWater = this.player.swimming;
    this.gather?.update(dt);
    this.islands.fauna?.update(dt, this.player);
    if (this.player.swimming) this.swimCurrent(dt);

    // caméra
    if (this.rig.mode === 'follow') {
      if (this.sailing.aboard) this.sailing.updateCamera(dt);
      else this.rig.target.set(this.player.pos.x, this.player.pos.y + 0.3, this.player.pos.z);
    } else if (this.rig.mode === 'portrait') {
      this.updatePortrait();
    }
    // le panneau du miroir a été remplacé par un autre : on sort proprement
    if (this.mirror && this.ui.panel?.sheet !== this.mirror.sheet && this.mirror.sheet) this.exitMirror();
    // origine flottante : on recentre au-delà de 2 km
    const P = this.player.pos;
    if (Math.hypot(P.x - ORIGIN.x, P.z - ORIGIN.z) > 2000) this.recenter(P.x, P.z);
    this.rig.update(dt);
    const f = this.rig.focus;
    const lf = this._lf.set(f.x - ORIGIN.x, f.y, f.z - ORIGIN.z);
    // ombres : autour de l'île de départ on garde le cadrage d'origine, ailleurs on suit
    const home = Math.hypot(f.x, f.z) < 40 ? 0.6 : 1;
    this.pipeline.shadowCenter.set(f.x * home - ORIGIN.x, 1, f.z * home - ORIGIN.z);

    // archipel
    this.islands.update(dt, P.x, P.z);
    this.marine?.update(dt, P.x, P.z, {
      wind: this.sailing.wind?.strength || 0,
      storm: !!this.weather.storm,
    });
    this.world.followOcean(lf.x, lf.z);
    this.world.setHomeDetail(Math.hypot(P.x, P.z) < 260);
    if (this.lastPos) {
      const step = Math.hypot(P.x - this.lastPos.x, P.z - this.lastPos.z);
      if (step < 30) this.state.explorer.distance += step;
    }
    this.lastPos = { x: P.x, z: P.z };

    // météo et monde
    this.weather.update(dt, lf);
    this.world.rain = this.weather.rain;
    this.world.update(dt, this.camera);
    this.updateAudio(dt);
    this.owl.update(dt, this.player.pos);
    this.fauna.update(dt, this.player.pos);
    this.collectibles.update(dt);
    this.decor.update(dt, this.input.pointer, this.camera);
    this.updateClickMarker(dt);
    this.updateHooks?.forEach((fn) => fn(dt));

    // invite d'interaction et étiquettes du monde
    this.updatePrompt();
    this.updateOwlBubble();
    this.updateNavHud(dt);

    // HUD
    this.hudTimer = (this.hudTimer || 0) - dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.5;
      this.updateClock();
      if (todayKey() !== this.dayKey) this.refreshDay();
    }

    // rendu
    this.pipeline.render(this.world.scene, this.camera, this.overlayScene);

    // sauvegarde différée
    st.player.x = this.player.pos.x;
    st.player.z = this.player.pos.z;
    this.saveTimer -= dt;
    if (this.dirty && this.saveTimer <= 0) this.saveNow();
  }

  updatePrompt() {
    if (this.airRide?.riding) {
      this.nearItem = null;
      this.nearAnimal = null;
      const p = projectCurved(this._v2.set(this.player.pos.x, this.player.pos.y + 1.8, this.player.pos.z), this.camera, window.innerWidth, window.innerHeight, this._v);
      if (p.visible) {
        if (this.airRide.flightPhase === 'freefall') {
          this.ui.showPrompt(this.pad.recent ? "Chute libre : stick planer · L3 piqué · ↑ rappeler l'aigle" : "Chute libre : ZQSD planer · Maj piqué · G rappeler l'aigle", p.x, p.y - 10);
        } else {
          this.ui.showPrompt(this.pad.recent ? 'Vol : stick · R2/L2 altitude · L3 turbo · ↑ chute libre · ✕ atterrir' : 'Vol : ZQSD · Espace/Ctrl altitude · Maj turbo · F chute libre · E atterrir', p.x, p.y - 10);
        }
      } else this.ui.hidePrompt();
      return;
    }
    if (this.sailing.aboard) {
      // à bord : on propose de débarquer quand une plage est à portée
      this.landT = (this.landT || 0) - 1;
      if (this.landT <= 0) {
        this.landT = 12;
        this.landSpot = Math.abs(this.sailing.speed) < 2.5 ? this.sailing.landingSpot() : null;
      }
      this.nearItem = null;
      if (!this.landSpot || this.ui.panelOpen) {
        this.ui.hidePrompt();
        return;
      }
      const p = projectCurved(this._v2.set(this.landSpot.x, groundAt(this.landSpot.x, this.landSpot.z).y + 0.6, this.landSpot.z), this.camera, window.innerWidth, window.innerHeight, this._v);
      if (p.visible) this.ui.showPrompt('Débarquer', p.x, p.y);
      else this.ui.hidePrompt();
      return;
    }
    if (this.ui.panelOpen || this.decor?.placing || this.player.mode === 'seated' || this.player.mode === 'action') {
      this.ui.hidePrompt();
      this.nearItem = null;
      return;
    }
    const it = this.interactions.nearest(this.player.pos, this.player.facing);
    this.nearItem = it;
    this.nearAnimal = null;
    if (!it && this.gather?.target) {
      const p0 = this.gather.promptPos();
      const p = p0 && projectCurved(this._v2.set(p0.x, p0.y, p0.z), this.camera, window.innerWidth, window.innerHeight, this._v);
      if (p?.visible) {
        this.ui.showPrompt(this.gather.target.label, p.x, p.y - 8);
        return;
      }
    }
    if (!it) {
      // un animal tout près : on peut le caresser
      const an = this.islands.fauna?.nearest(this.player.pos.x, this.player.pos.z, 2.2);
      if (an) {
        this.nearAnimal = an;
        const p = projectCurved(this._v2.set(an.x, an.y + an.def.scale * 1.1, an.z), this.camera, window.innerWidth, window.innerHeight, this._v);
        if (p.visible) {
          this.ui.showPrompt(`Caresser : ${this.islands.fauna.label(an).toLowerCase()}`, p.x, p.y - 8);
          return;
        }
      }
      this.ui.hidePrompt();
      return;
    }
    const p = projectCurved(it.pos, this.camera, window.innerWidth, window.innerHeight, this._v);
    if (!p.visible) {
      this.ui.hidePrompt();
      return;
    }
    this.ui.showPrompt(this.interactions.labelOf(it), p.x, p.y - 8);
  }

  updateOwlBubble() {
    const o = this.world.spots.owl;
    const d = Math.hypot(this.player.pos.x - o.x, this.player.pos.z - o.z);
    const show = d < 4.2 && !this.ui.panelOpen;
    if (show) {
      if (!this.owlLine) {
        const lines = ['Hou hou ! Le large t\'appelle ?', 'Mes cartes sont pleines de blancs…', 'Chaque île a son secret.'];
        this.owlLine = lines[Math.floor(Math.random() * lines.length)];
      }
      const pos = o.perch.clone().add(new THREE.Vector3(0, 1.9, 0));
      const p = projectCurved(pos, this.camera, window.innerWidth, window.innerHeight, this._v);
      this.ui.bubble('owl', this.owlLine, p.x, p.y, p.visible);
    } else {
      this.owlLine = null;
      this.ui.bubble('owl', null);
    }
  }

  updateClock() {
    const d = new Date();
    const h = this.world.dayCycle.hour;
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    const name = this.world.dayCycle.state.name || '';
    this.ui.setClock(`${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${name}`);
    if (this.decor?.placing) return;
    // l'aide ne s'affiche qu'aux 3 premières visites, ou si l'on reste immobile 20 s
    const idle = performance.now() - (this.input?.lastMove || 0) > 20000 && this.player.vel.lengthSq() < 0.01;
    const showHint = (this.state.launches || 0) <= 3 || idle;
    const hint = this.pad?.recent ? this.pad.hint() : 'ZQSD : courir · Maj : sprint · Alt : marcher · Espace : sauter · C : roulade · E : interagir · M : carte · glisser : tourner';
    this.ui.setHint(showHint ? hint : '');
  }

  // ---------------------------------------------------------------------------
  // Entrées
  // ---------------------------------------------------------------------------
  handleKey(code, e) {
    if (code === 'Escape') {
      if (this.ui.panelOpen) {
        if (this.ui.panel.dismissable !== false) this.ui.closePanel();
        return true;
      }
      if (this.player.mode === 'seated' && !this.player.locked) {
        this.player.stand();
        return true;
      }
      if (this.decor?.placing) {
        this.decor.cancelPlacement();
        return true;
      }
      return false;
    }
    if (this.ui.panelOpen) return false;
    if (e.repeat) return false;
    if (code === 'KeyG') {
      this.airRide.summon();
      return true;
    }
    if (code === 'KeyF') {
      this.airRide.freeFall();
      return true;
    }
    if (this.airRide.riding) {
      if (code === 'KeyE' || code === 'Enter') {
        if (this.airRide.flightPhase === 'freefall') {
          this.airRide.catchBird();
          return true;
        }
        this.airRide.requestLanding();
        return true;
      }
      // En vol, Espace et Ctrl pilotent l'altitude ; E reste l'action d'atterrissage.
      if (code === 'Space') return false;
    }
    if (this.decor?.placing) {
      if (code === 'KeyR') {
        this.decor.rotate();
        return true;
      }
      if (code === 'Delete' || code === 'Backspace') {
        this.decor.storePlacement();
        return true;
      }
    }
    // 1 à 8 : case de la barre rapide
    if (/^Digit[1-8]$/.test(code)) {
      this.hotbar.select(Number(code[5]) - 1);
      return true;
    }
    switch (code) {
      case 'KeyE':
      case 'Enter':
        return this.interactPrimary(true);
      // Espace saute (voir buildIntent) ; pendant la pêche, il ferre
      case 'Space':
        return this.gather?.fishing ? this.gather.strike() : false;
      case 'KeyJ':
        this.openJournal();
        return true;
      case 'KeyM':
        this.openMap();
        return true;
      case 'KeyP':
        this.openSettings();
        return true;
      case 'KeyI':
        this.openInventory();
        return true;
      case 'KeyN':
        this.toggleMute();
        return true;
      default:
        return false;
    }
  }

  // Action principale (E, Entrée, ✕) : ferrer, débarquer, outil, caresser, interagir,
  // poser une station, se lever. allowTool = false : la manette garde □ pour l'outil
  // et ✕ saute quand il n'y a rien d'autre à faire.
  interactPrimary(allowTool = true) {
    if (this.gather?.fishing) return this.gather.strike();
    if (this.sailing.aboard) {
      this.sailing.disembark();
      return true;
    }
    if (allowTool && this.gather?.target && !this.nearItem) {
      this.gather.act();
      return true;
    }
    if (this.nearAnimal && !this.nearItem) {
      this.petAnimal(this.nearAnimal);
      return true;
    }
    if (this.nearItem) {
      this.interact(this.nearItem);
      return true;
    }
    // Une station fabriquée se pose depuis la barre rapide, dans le même
    // mode de placement que les décorations achetées.
    if (this.gather?.selectedItem()?.station) {
      this.decor.startPlacement(this.gather.selectedItem().id);
      return true;
    }
    if (this.player.mode === 'seated' && !this.player.locked) {
      this.player.stand();
      return true;
    }
    return false;
  }

  // Intention de déplacement de l'image : direction (relative à la caméra), allure,
  // appuis de saut et de roulade (clavier ou manette)
  buildIntent() {
    const I = (this._intent ||= { move: new THREE.Vector3(), sprint: false, walk: false, jump: false, jumpHeld: false, roll: false });
    const input = this.input;
    const blocked = this.ui.panelOpen || this.sailing.aboard;
    if (blocked) I.move.set(0, 0, 0);
    else input.moveVector(this.rig.forward, I.move);
    const k = input.keys;
    I.sprint = !blocked && input.run;
    I.walk = !blocked && (k.has('AltLeft') || k.has('AltRight'));
    const jump = input.consumeTap('Space') || this.pad.consume('jump');
    const roll = input.consumeTap('KeyC') || this.pad.consume('roll');
    I.jump = !blocked && jump && !this.gather?.fishing;
    I.roll = !blocked && roll && !this.decor?.placing;
    I.jumpHeld = k.has('Space') || this.pad.jumpHeld;
    input.taps.clear();
    return I;
  }

  // Événements de locomotion de l'image (sons, poussière, vibrations, caméra)
  consumeLocoEvents() {
    const ev = this.player.events;
    if (!ev.length) return;
    for (const e of ev) this.onLocoEvent?.(e);
    ev.length = 0;
  }

  handleClick(x, y) {
    if (this.ui.panelOpen || this.airRide?.riding) return;
    this.audio?.resume();
    if (this.decor.placing) {
      this.decor.place();
      return;
    }
    const it = this.interactions.pick(x, y, this.camera, window.innerWidth, window.innerHeight);
    if (it) {
      this.player.goTo(it.approach.x, it.approach.z, () => this.interact(it), it.stopDist ?? 0.35);
      this.showClickMarker(it.approach.x, it.approach.z);
      return;
    }
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    const hit = pickGround(rc);
    if (hit && this.onGroundClick?.(hit)) return;
    if (hit && !this.player.locked) {
      this.player.goTo(hit.x, hit.z);
      this.showClickMarker(hit.x, hit.z);
    }
  }

  interact(item) {
    if (this.player.locked) return;
    this.audio?.resume();
    this.player.faceTowards(item.pos.x, item.pos.z);
    this.character.bounce(0.7);
    this.audio?.pop(1);
    item.action();
  }

  openInventory() {
    openInventoryPanel(this);
  }

  stationsNear() {
    const p = this.player.pos;
    return nearbyStations(this.state.decor, p.x, p.z);
  }

  onCrafted(recipe) {
    this.markDirty();
    this.ui.toast(`${recipe.out ? 'Objet fabriqué' : 'Fabrication terminée'} !`, { icon: 'leaf' });
  }

  // ---------------------------------------------------------------------------
  // Petits retours visuels
  // ---------------------------------------------------------------------------
  buildClickMarker() {
    const g = new THREE.RingGeometry(0.22, 0.32, 24);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color: 0xfffaf0, transparent: true, depthWrite: false });
    this.marker = new THREE.Mesh(g, m);
    this.marker.visible = false;
    this.marker.renderOrder = 20;
    this.overlayScene = new THREE.Scene();
    this.overlayScene.add(this.marker);
    this.markerT = 0;
  }

  showClickMarker(x, z) {
    this.markerAbs = { x, z };
    this.marker.position.set(x - ORIGIN.x, groundAt(x, z).y + 0.04, z - ORIGIN.z);
    this.marker.visible = true;
    this.markerT = 0;
  }

  updateClickMarker(dt) {
    if (!this.marker.visible) return;
    this.markerT += dt;
    const k = this.markerT / 0.7;
    const s = 0.6 + Math.sin(Math.min(1, k) * Math.PI * 0.5) * 0.8;
    this.marker.scale.set(s, 1, s);
    this.marker.material.opacity = Math.max(0, 1 - k);
    // suit la courbure du monde
    const o = U.uCurveOrigin.value;
    const dir = U.uCurveDir.value;
    const a = this.markerAbs;
    this.marker.position.set(a.x - ORIGIN.x, 0, a.z - ORIGIN.z);
    const dx = this.marker.position.x - o.x;
    const dz = this.marker.position.z - o.z;
    const along = Math.max(dx * dir.x + dz * dir.y, 0);
    this.marker.position.y = groundAt(a.x, a.z).y + 0.04 - U.uCurvature.value * along * along;
    if (k >= 1) this.marker.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Économie et ramassage
  // ---------------------------------------------------------------------------
  addShells(n, reason = '') {
    if (!n) return;
    this.state.shells = Math.max(0, this.state.shells + n);
    if (n > 0) this.state.shellsEarned = (this.state.shellsEarned || 0) + n;
    this.ui.setShells(this.state.shells, n);
    if (n > 0) this.audio?.coin();
    this.markDirty();
  }

  pickUp(item) {
    const k = KINDS[item.kind];
    this.player.playAction('pickup', 0.95, () => {});
    this.collectibles.remove(item);
    const c = this.state.collect;
    c.taken.push(item.id);
    c.totals[item.kind] = (c.totals[item.kind] || 0) + 1;
    if (item.kind === 'peche') {
      const left = this.inv.add('peche', 1);
      if (left) {
        this.addShells(k.value, 'tresor');
        this.ui.toast('Ton sac est plein : la pêche est échangée contre quelques coquillages.', { icon: 'sparkle' });
      } else {
        this.ui.pickup?.('peche', 1);
        this.ui.toast('Une pêche fraîche ajoutée à ton sac !', { icon: 'sparkle' });
      }
      this.audio?.pop(1.4);
    } else {
      setTimeout(() => {
        this.addShells(k.value, 'tresor');
        this.ui.toast(`Tu as trouvé ${item.kind === 'etoile' || item.kind === 'perle' ? 'une' : 'un'} ${k.name} !`, { icon: 'sparkle' });
        this.audio?.pop(1.4);
      }, 380);
    }
    this.markDirty();
  }

  collectMarine(item) {
    const rewards = { bouteille: 3, caisse: 5, bouee: 1 };
    const value = rewards[item.type] || 1;
    this.state.marine ||= { taken: [] };
    this.state.marine.taken = this.marine.serializeTaken();
    this.addShells(value, 'marin');
    const label = item.type === 'bouteille' ? 'une bouteille échouée' : item.type === 'caisse' ? 'une caisse flottante' : 'une bouée';
    this.ui.toast(`Tu as trouvé ${label} (+${value} coquillages).`, { icon: 'sparkle' });
    this.audio?.splash?.(0.45);
    this.markDirty();
  }

  refreshDay() {
    this.dayKey = todayKey();
    const c = this.state.collect;
    if (c.day !== this.dayKey) {
      c.day = this.dayKey;
      c.taken = [];
      this.markDirty();
    }
    this.collectibles.refresh(this.dayKey, c.taken);
    this.onNewDay?.();
  }

  // Fleurs sauvages : celles que les heures d'étude de l'ancienne version ont fait pousser restent
  updateProgressVisuals(announce = false) {
    const hours = legacyHours(this.state);
    const unlocked = this.world.flowers.setProgress(hours);
    for (const rare of unlocked) {
      for (const o of rare.obstacles) addObstacle(o);
      if (announce) setTimeout(() => this.ui.toast(rare.label, { icon: 'sparkle', duration: 5200 }), 2400);
    }
    this.fauna?.setSpots(this.world.flowers.spots());
  }

  // ---------------------------------------------------------------------------
  // Échoppe
  // ---------------------------------------------------------------------------
  openShop() {
    openShopPanel(this);
  }

  // Vignette d'une décoration (rendue une fois, mise en cache)
  decorThumb(type) {
    this.thumbs = this.thumbs || {};
    if (this.thumbs[type]) return this.thumbs[type];
    const def = CATALOG[type];
    const S = 160;
    const rt = new THREE.WebGLRenderTarget(S, S);
    const scene = new THREE.Scene();
    const obj = def.build();
    const o = U.uCurveOrigin.value.clone();
    obj.position.copy(o);
    obj.position.y = 0;
    scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const dist = Math.max(size.x, size.y, size.z) * 1.75 + 0.3;
    cam.position.set(center.x + dist * 0.55, center.y + dist * 0.45, center.z + dist * 0.75);
    cam.lookAt(center);
    const saved = { c: U.uCurvature.value, s: U.uShadowOn.value, f: U.uFogRange.value.clone() };
    U.uCurvature.value = 0;
    U.uShadowOn.value = 0;
    U.uFogRange.value.set(500, 600);
    const r = this.renderer;
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, cam);
    const px = new Uint8Array(S * S * 4);
    r.readRenderTargetPixels(rt, 0, 0, S, S, px);
    r.setRenderTarget(null);
    U.uCurvature.value = saved.c;
    U.uShadowOn.value = saved.s;
    U.uFogRange.value.copy(saved.f);
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) img.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    g.putImageData(img, 0, 0);
    this.thumbs[type] = c.toDataURL();
    return this.thumbs[type];
  }

  // ---------------------------------------------------------------------------
  // Exploration : journal de bord, carte, cartographe
  // ---------------------------------------------------------------------------
  openJournal() {
    openLogbookPanel(this);
  }

  // Nouvelle île en vue : notée dans le journal de bord
  discoverIsland(desc) {
    const ex = this.state.explorer;
    if (ex.islands[desc.id]) return;
    ex.islands[desc.id] = { name: desc.name, biome: desc.biome, archetype: desc.archetype, x: Math.round(desc.x), z: Math.round(desc.z), r: Math.round(desc.r), t: Date.now(), pois: [], animals: [] };
    this.markDirty();
    const kind = ARCHETYPES[desc.archetype]?.name;
    this.ui.toast(`Nouvelle île : ${desc.name}${kind ? ` — ${kind.toLowerCase()}` : ''}`, { icon: 'map', duration: 4200 });
    this.audio?.pop(1.3);
  }

  // Ancienne génération : les îles notées gardent leur entrée, rattachée à l'île la plus proche
  relinkDiscoveries() {
    if (relinkDiscoveries(this.state)) this.markDirty();
  }

  // Un lieu découvert à pied : noté sur la carte et dans la fiche de l'île
  discoverPoi(e, p) {
    const ex = this.state.explorer;
    ex.pois ||= {};
    if (ex.pois[p.id]) return;
    const name = p.name || POI_LABELS[p.type] || p.label;
    ex.pois[p.id] = { name, type: p.type, x: Math.round(e.desc.x + p.x), z: Math.round(e.desc.z + p.z), island: e.desc.id };
    const isl = ex.islands[e.desc.id];
    if (isl) (isl.pois ||= []).push(p.id);
    this.markDirty();
    if (p.type !== 'cascade' || !Object.values(ex.pois).some((q) => q.type === 'cascade' && q.island === e.desc.id && q !== ex.pois[p.id])) {
      this.ui.toast(`Découverte : ${name}`, { icon: 'sparkle', duration: 3200 });
    }
  }

  petAnimal(an) {
    const f = this.islands.fauna;
    this.player.faceTowards(an.x, an.z);
    this.character.bounce(0.8);
    f.pet(an);
    this.audio?.pop(1.5);
    const ex = this.state.explorer;
    ex.animals ||= {};
    const first = !ex.animals[an.sp];
    ex.animals[an.sp] = (ex.animals[an.sp] || 0) + 1;
    const isl = ex.islands[an.entry.desc.id];
    if (isl && !(isl.animals ||= []).includes(an.sp)) isl.animals.push(an.sp);
    if (first) this.ui.toast(`Nouvelle rencontre : ${f.label(an).toLowerCase()} !`, { icon: 'sparkle', duration: 3000 });
    this.markDirty();
  }

  // Interactions des lieux d'une île au premier plan (coffres, tour de guet, barque à réparer…)
  onIslandNear(e, on) {
    const I = this.interactions;
    const ids = (e.interactionIds ||= []);
    for (const id of ids) I.remove(id);
    ids.length = 0;
    if (!on || !e.plan) return;
    const st = this.state;
    st.opened ||= {};
    const add = (item) => {
      I.add(item);
      ids.push(item.id);
    };
    const abs = (x, y, z) => new THREE.Vector3(e.desc.x + x, y, e.desc.z + z);
    for (const p of e.plan.pois) {
      const it = p.interact;
      if (!it) continue;
      const y = e.surf.height(it.x, it.z);
      if (it.kind === 'coffre') {
        add({ id: `poi:${p.id}`, pos: abs(it.x, y + 1, it.z), radius: 2.2, label: () => (st.opened[p.id] ? 'Coffre vide' : 'Ouvrir le coffre'), enabled: () => !st.opened[p.id], action: () => this.openChest(p.id, p.name || 'l\'épave') });
      } else if (it.kind === 'tour') {
        add({ id: `poi:${p.id}`, pos: abs(it.x, y + 1.5, it.z), radius: 3, label: 'Monter à la tour de guet', action: () => this.lookout(e.desc.x + it.x, e.desc.z + it.z) });
      } else if (it.kind === 'reparer') {
        add({ id: `poi:${p.id}`, pos: abs(it.x, y + 0.8, it.z), radius: 2.6, label: () => (st.opened[p.id] ? 'Barque réparée' : 'Réparer la barque (10 planches, 4 cordes)'), enabled: () => !st.opened[p.id], action: () => this.repairBoat(p.id) });
      } else if (it.kind === 'feu') {
        add({ id: `poi:${p.id}`, pos: abs(it.x, y + 0.8, it.z), radius: 2.4, label: 'S\'asseoir près du feu', action: () => this.player.sitAt({ x: e.desc.x + it.x + 1.5, z: e.desc.z + it.z, y: y + 0.3, facing: -Math.PI / 2, pose: 'sit', exit: { x: e.desc.x + it.x + 2.4, z: e.desc.z + it.z } }) });
      }
    }
    for (const m of e.plan.micro) {
      if (m.t === 'coffre_cache') {
        const y = e.surf.height(m.x, m.z);
        add({ id: `poi:${m.id}`, pos: abs(m.x, y + 0.8, m.z), radius: 1.8, label: () => (st.opened[m.id] ? 'Coffre vide' : 'Ouvrir le petit coffre'), enabled: () => !st.opened[m.id], action: () => this.openChest(m.id, 'un coffre caché') });
      } else if (m.t === 'banc_vue') {
        const y = e.surf.height(m.x, m.z);
        add({ id: `poi:${m.id}`, pos: abs(m.x, y + 0.9, m.z), radius: 1.8, label: 'S\'asseoir et contempler', action: () => this.player.sitAt({ x: e.desc.x + m.x, z: e.desc.z + m.z, y: y + 0.45, facing: Math.PI / 2 - m.rot, pose: 'sit', exit: { x: e.desc.x + m.x - Math.cos(m.rot), z: e.desc.z + m.z - Math.sin(m.rot) } }) });
      }
    }
    for (const q of e.plan.pathParts) {
      if (q.t !== 'panneau') continue;
      const names = e.plan.pois.filter((p) => p.r && p.type !== 'cascade').map((p) => p.name || POI_LABELS[p.type]).slice(0, 4);
      const y = e.surf.height(q.x, q.z);
      add({ id: `poi:${q.id}`, pos: abs(q.x, y + 1.6, q.z), radius: 2, label: 'Lire le panneau', action: () => this.ui.toast(`${e.desc.name} : ${names.join(' · ')}`, { icon: 'map', duration: 5200 }) });
    }
  }

  openChest(id, from) {
    const st = this.state;
    st.opened ||= {};
    if (st.opened[id]) return;
    st.opened[id] = Date.now();
    const rng = mulberry32(id ^ 0xc0ffee);
    const shells = 8 + Math.floor(rng() * 14);
    const loot = [['corde', 2], ['planche', 4], ['verre', 1], ['lingot_cuivre', 1], ['clous', 4], ['tissu', 1], ['appat', 2]];
    const got = [];
    for (let k = 0; k < 2; k++) {
      const [item, n] = loot[Math.floor(rng() * loot.length)];
      if (this.inv.add(item, n) < n) got.push(item);
    }
    this.addShells(shells, 'coffre');
    this.player.playAction('pickup', 0.95, () => {});
    this.ui.toast(`Tu ouvres ${from} : ${shells} coquillages${got.length ? ' et quelques trouvailles' : ''} !`, { icon: 'chest', duration: 3600 });
    this.markDirty();
  }

  // Tour de guet : la carte se dévoile tout autour (400 m)
  lookout(x, z) {
    const fog = this.state.explorer.fog;
    let n = 0;
    for (let r = 60; r <= 400; r += 60) for (let a = 0; a < Math.PI * 2; a += 60 / r) n += reveal(fog, x + Math.cos(a) * r, z + Math.sin(a) * r, 60);
    n += reveal(fog, x, z, 60);
    this.character.setPose('celebrate');
    setTimeout(() => this.character.pose === 'celebrate' && this.character.setPose('idle'), 1300);
    this.ui.toast(n ? 'Du haut de la tour, toute l\'île et ses environs apparaissent sur ta carte (M).' : 'Tu connais déjà tout ce que l\'on voit d\'ici.', { icon: 'map', duration: 4200 });
    this.markDirty();
  }

  // Barque abandonnée : quelques planches et elle reprend la mer
  repairBoat(id) {
    const st = this.state;
    if (!this.inv.has({ planche: 10, corde: 4 })) {
      this.ui.toast('Il faut 10 planches et 4 cordes pour la remettre à flot.', { icon: 'boat' });
      return;
    }
    this.inv.removeAll({ planche: 10, corde: 4 });
    st.opened ||= {};
    st.opened[id] = Date.now();
    this.player.playAction('build', 1.6, () => {});
    if (!st.boat.owned.includes('barque')) {
      st.boat.owned.push('barque');
      this.ui.toast('La barque est réparée : elle est à toi ! Choisis ton bateau au ponton.', { icon: 'boat', duration: 5200 });
    } else {
      this.addShells(25, 'barque');
      this.ui.toast('Barque réparée : un pêcheur du coin te remercie (+25 coquillages).', { icon: 'boat', duration: 4200 });
    }
    this.markDirty();
  }

  // Le bateau revient au ponton (petit fondu de papier)
  recallBoat(x, z, heading) {
    this.fade.classList.add('on');
    setTimeout(() => {
      this.sailing.recallTo(x, z, heading);
      this.fade.classList.remove('on');
      this.ui.toast('Ton bateau t\'attend au ponton.', { icon: 'boat' });
      this.markDirty();
    }, 450);
  }

  // À la nage, trop loin de toute terre : un courant doux ramène vers la côte la plus proche
  swimCurrent(dt) {
    const P = this.player.pos;
    const dHome = Math.hypot(P.x, P.z) - 32;
    const near = this.islands.nearest(P.x, P.z);
    let tx = 0;
    let tz = 0;
    let d = dHome;
    if (near && near.d < dHome) {
      d = near.d;
      tx = near.desc.x;
      tz = near.desc.z;
    }
    if (d < 70) return;
    const len = Math.hypot(tx - P.x, tz - P.z) || 1;
    P.x += ((tx - P.x) / len) * dt * 1.4;
    P.z += ((tz - P.z) / len) * dt * 1.4;
    if (!this.swimWarned) {
      this.swimWarned = true;
      this.ui.toast('Trop loin pour nager : le courant te ramène vers la côte. Prends ton bateau !', { icon: 'boat', duration: 4800 });
      setTimeout(() => (this.swimWarned = false), 20000);
    }
  }

  // Boussole, jauges du bateau, brouillard de la carte
  updateNavHud(dt) {
    const s = this.sailing;
    const P = this.player.pos;
    // le marqueur d'embarquement suit le bateau
    if (this.boatItem) {
      this.boatItem.pos.set(s.pos.x, 1.0, s.pos.z);
      this.boatItem.approach = { x: s.pos.x, z: s.pos.z };
    }
    this.navT = (this.navT || 0) - dt;
    if (this.navT > 0) return;
    this.navT = 0.1;
    const f = this.rig.forward;
    const bearing = (Math.atan2(f.x, -f.y) * 180) / Math.PI;
    const toBearing = (x, z) => (Math.atan2(x - P.x, -(z - P.z)) * 180) / Math.PI;
    const marks = [];
    if (Math.hypot(P.x, P.z) > 30) marks.push({ bearing: toBearing(0, 0), icon: 'home', label: 'Ton île' });
    if (!s.aboard && s.distanceTo(P.x, P.z) > 12) marks.push({ bearing: toBearing(s.pos.x, s.pos.z), icon: 'boat', label: 'Ton bateau' });
    for (const p of this.state.explorer.pins.slice(0, 8)) marks.push({ bearing: toBearing(p.x, p.z), icon: 'pin', label: 'Épingle' });
    this.ui.setCompass(((bearing % 360) + 360) % 360, marks);
    if (s.aboard) {
      const info = s.hud();
      info.name = BOATS[s.type].name;
      // vent relatif à la vue ; l'icône pointe vers la droite au repos (d'où −90°)
      const wb = (Math.atan2(Math.cos(info.wind), -Math.sin(info.wind)) * 180) / Math.PI;
      info.windRel = ((wb - bearing - 90) * Math.PI) / 180;
      this.ui.setSailHud(info);
    } else this.ui.setSailHud(null);
    // brouillard levé autour de soi (60 m)
    this.fogT = (this.fogT || 0) - 0.1;
    if (this.fogT <= 0) {
      this.fogT = 0.5;
      if (reveal(this.state.explorer.fog, P.x, P.z, 60)) this.markDirty();
    }
  }

  // Origine flottante : le monde est décalé pour garder des coordonnées locales petites
  recenter(x, z) {
    ORIGIN.set(Math.round(x / 512) * 512, 0, Math.round(z / 512) * 512);
    this.world.applyOrigin();
    this.islands?.applyOrigin();
    this.player?.sync();
  }

  openMap() {
    openMapPanel(this);
  }

  openCartographer() {
    this.owl.cheer();
    openCartographerPanel(this);
  }

  openSettings() {
    openSettingsPanel(this);
  }

  // ---------------------------------------------------------------------------
  // Miroir : cadrage portrait, le personnage à gauche, le panneau à droite
  // ---------------------------------------------------------------------------
  openMirror(opts = {}) {
    openMirrorPanel(this, opts);
  }

  enterMirror(onExit) {
    if (this.mirror) this.exitMirror();
    const P = this.player;
    if (P.mode === 'seated') P.stand();
    if (P.mode === 'goto') P.mode = 'free';
    const r = this.rig;
    this.mirror = { onExit, sheet: null, saved: { yaw: r.yaw, pitch: r.pitch, distance: r.distance }, camYaw: this.clearPortraitYaw(r.cur.yaw) };
    // le personnage se tourne vers la caméra (un peu de trois-quarts)
    P.facing = this.mirror.camYaw + 0.25;
    this.character.setPose('idle');
    r.mode = 'portrait';
    // le HUD s'efface devant le miroir
    this.uiRoot.dataset.mirror = '1';
  }

  // Angle de caméra dégagé : on suit la vraie ligne de visée (cible décalée comprise)
  // et on teste les obstacles de navigation (poteaux, arbres, lampadaires, décor).
  clearPortraitYaw(start) {
    const P = this.player.pos;
    const halfW = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 3.4 * this.camera.aspect;
    const shift = Math.min(1.4, 0.4 * halfW);
    for (const d of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2.0, -2.0, Math.PI]) {
      const yaw = start + d;
      const tx = P.x + Math.cos(yaw) * shift;
      const tz = P.z - Math.sin(yaw) * shift;
      const cx = tx + Math.sin(yaw) * 3.4;
      const cz = tz + Math.cos(yaw) * 3.4;
      let clear = true;
      // marge large : une ligne qui traverse une clôture passe forcément près d'un poteau
      for (let k = 1; k <= 12 && clear; k++) {
        const t = k / 12;
        if (blockedByObstacle(P.x + (cx - P.x) * t, P.z + (cz - P.z) * t, 0.35)) clear = false;
      }
      if (clear) return yaw;
    }
    return start;
  }

  updatePortrait() {
    const r = this.rig;
    const P = this.player.pos;
    const yaw = this.mirror.camYaw;
    // décale la cible vers la droite de l'écran : le personnage reste visible à gauche du panneau
    const panel = this.ui.panel?.sheet?.getBoundingClientRect();
    const share = panel && panel.width ? (panel.width + 32) / innerWidth : 0.4;
    const halfW = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 3.4 * this.camera.aspect;
    const shift = Math.min(1.4, share * halfW);
    r.yaw = yaw;
    r.pitch = 0.1;
    r.distance = 3.4;
    r.target.set(P.x + Math.cos(yaw) * shift, P.y + 0.05, P.z - Math.sin(yaw) * shift);
  }

  exitMirror() {
    const m = this.mirror;
    if (!m) return;
    this.mirror = null;
    delete this.uiRoot.dataset.mirror;
    m.onExit?.();
    const r = this.rig;
    r.mode = 'follow';
    r.yaw = m.saved.yaw;
    r.pitch = m.saved.pitch;
    r.distance = m.saved.distance;
  }

  toggleMute() {
    this.audio.resume();
    this.audio.setMuted(!this.audio.muted);
    this.ui.setMuted(this.audio.muted);
    this.ui.toast(this.audio.muted ? 'Son coupé.' : 'Son activé.', { icon: this.audio.muted ? 'mute' : 'sound', duration: 1600 });
  }

  updateAudio(dt) {
    const p = this.player.pos;
    const r = Math.hypot(p.x, p.z);
    const wf = this.world.waterfall.userData.foamPos;
    this.audio.update(dt, {
      coast: THREE.MathUtils.smoothstep(r, 12, 24),
      waterfall: THREE.MathUtils.smoothstep(Math.hypot(p.x - wf.x, p.z - wf.z), 14, 2),
      night: U.uNight.value,
      rain: this.weather.rain,
      wind: p.y > 2.5 ? 1 : 0.45,
    });
  }

  onPanelChange() {}

  // ---------------------------------------------------------------------------
  // Réglages
  // ---------------------------------------------------------------------------
  applySettings() {
    const s = this.state.settings;
    // profil de locomotion : élan réaliste ou réactif
    this.player?.setProfile(s.motion?.profile === 'reactif' ? 'reactif' : 'realiste');
    this.pipeline.setQuality(s.quality);
    this.pipeline.settings.paint = s.paint > 0;
    this.pipeline.settings.paintStrength = Math.max(0.4, s.paint || 1);
    this.pipeline.settings.outline = s.outline;
    this.pipeline.settings.paper = s.paper;
    U.uCurvature.value = 0.000002 * s.curvature;
    const season = seasonOf(new Date(), s.season);
    if (season !== this.season) {
      this.season = season;
      applySeason(this.world.foliage, season);
      if (this.weather) this.weather.baseSnow = seasonSnow(season);
    }
    this.world.dayCycle.override = s.timeMode === 'real' ? null : s.timeOverride;
    const t = new URLSearchParams(location.search).get('t');
    if (t !== null) this.world.dayCycle.override = parseFloat(t);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.pipeline.setSize(window.innerWidth, window.innerHeight);
  }

  // ---------------------------------------------------------------------------
  // Sauvegarde
  // ---------------------------------------------------------------------------
  markDirty() {
    if (!this.dirty) this.saveTimer = 2;
    this.dirty = true;
  }

  saveNow() {
    if (this.skipSave) return;
    this.dirty = false;
    this.saveTimer = 5;
    this.state.updatedAt = Date.now();
    writeSave(this.state);
  }

  onVisibility() {
    if (document.hidden) this.saveNow();
  }

  // ---------------------------------------------------------------------------
  devTools() {
    const game = this;
    return {
      game,
      U,
      // navigation du jeu (même instance que le joueur : relief des îles, obstacles)
      nav: { groundAt, obstacleAt, waterDepth },
      setHour(h) {
        game.world.dayCycle.override = h;
      },
      frame({ dist, pitch, yaw, tx, tz } = {}) {
        const r = game.rig;
        r.limits.maxDist = 90;
        if (dist !== undefined) r.distance = r.cur.distance = dist;
        if (pitch !== undefined) r.pitch = r.cur.pitch = pitch;
        if (yaw !== undefined) r.yaw = r.cur.yaw = yaw;
        if (tx !== undefined) {
          r.target.x = r.focus.x = tx;
        }
        if (tz !== undefined) {
          r.target.z = r.focus.z = tz;
        }
        // la cible est posée sur le sol réel (comme en jeu, où elle suit le joueur)
        r.target.y = r.focus.y = groundAt(r.target.x, r.target.z).y + 0.3;
        r.update(0);
      },
      // regarde un point lointain (îles) depuis (fx, fz)
      look(tx, tz, { fx = game.player.pos.x, fz = game.player.pos.z, pitch = 0.14, dist = 18, h = null } = {}) {
        const r = game.rig;
        r.mode = 'shot';
        r.limits.maxDist = 400;
        // pas d'évitement du relief pour les vues fixes
        if (r.groundFn) r.savedGroundFn = r.groundFn;
        r.groundFn = null;
        r.occPitch = 0;
        r.occDist = 1;
        r.yaw = r.cur.yaw = Math.atan2(-(tx - fx), -(tz - fz));
        r.pitch = r.cur.pitch = pitch;
        r.distance = r.cur.distance = dist;
        r.target.set(fx, h ?? groundAt(fx, fz).y + 1, fz);
        r.focus.copy(r.target);
        for (let i = 0; i < 5; i++) r.update(0.05);
        return { yaw: r.yaw };
      },
      // fait tourner la boucle à la main (onglet en arrière-plan : rAF ralenti)
      async settle(ms = 1500) {
        const t0 = performance.now();
        while (performance.now() - t0 < ms) {
          game.frame();
          await new Promise((r) => setTimeout(r, 16));
        }
        return game.islands.info();
      },
      follow() {
        game.rig.mode = 'follow';
        if (game.rig.savedGroundFn) game.rig.groundFn = game.rig.savedGroundFn;
      },
      // téléporte le joueur (coordonnées absolues)
      tp(x, z) {
        game.player.place(x, z);
        game.rig.target.copy(game.player.pos);
        game.rig.focus.copy(game.player.pos);
      },
      perf() {
        const r = game.renderer;
        r.info.autoReset = false;
        r.info.reset();
        return new Promise((res) => requestAnimationFrame(() => {
          r.info.reset();
          requestAnimationFrame(() => {
            const out = { calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures, fps: Math.round(game.fps), islands: game.islands.info(), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
            r.info.autoReset = true;
            res(out);
          });
        }));
      },
      async capture(name = 'capture') {
        game.rig.update(0);
        game.world.update(0, game.camera);
        game.pipeline.forceShadow = true;
        const url = game.pipeline.capture(game.world.scene, game.camera, game.overlayScene);
        await fetch(`/__capture?name=${encodeURIComponent(name)}`, { method: 'POST', body: url });
        return 'ok';
      },
      // Cadrages fixes pour comparer avant / après
      cadrages: {
        arrivee: { h: 11, p: [0, 4.5, Math.PI], cam: { dist: 16, pitch: 0.56, yaw: 0, tx: 0, tz: 4.5 } },
        ensemble: { h: 11, p: [1, 4, Math.PI], cam: { dist: 40, pitch: 0.62, yaw: 0, tx: 1, tz: 2 } },
        plage: { h: 11, p: [14, 17, 0.6], cam: { dist: 11, pitch: 0.38, yaw: -0.9, tx: 15.5, tz: 17 } },
        falaise: { h: 11, p: [-2, -3.2, Math.PI], cam: { dist: 9, pitch: 0.3, yaw: 0.25, tx: -1.5, tz: -5 } },
        maison: { h: 11, p: [8.6, 3.6, Math.PI], cam: { dist: 9, pitch: 0.3, yaw: -0.3, tx: 8.4, tz: 1.5 } },
        bibliotheque: { h: 11, p: [6.0, -12.6, Math.PI], cam: { dist: 10, pitch: 0.32, yaw: 0.2, tx: 6.3, tz: -15 } },
        nuit: { h: 22, p: [1, 4, Math.PI], cam: { dist: 22, pitch: 0.5, yaw: 0.1, tx: 1, tz: 1 } },
        // personnage : yaw relatif à son orientation (0 = de face), sauf perso-jeu (cadrage de jeu, de dos)
        'perso-face': { h: 11, perso: { at: [3.2, 3.6, 0.6], yaw: 0, dist: 2.9, pitch: 0.12, ty: 0.2 } },
        'perso-34': { h: 11, perso: { at: [3.2, 3.6, 0.6], yaw: -0.7, dist: 2.9, pitch: 0.12, ty: 0.2 } },
        'perso-profil': { h: 11, perso: { at: [3.2, 3.6, 0.6], yaw: Math.PI / 2, dist: 2.9, pitch: 0.12, ty: 0.2 } },
        'perso-dos': { h: 11, perso: { at: [3.2, 3.6, 0.6], yaw: Math.PI - 0.4, dist: 2.9, pitch: 0.12, ty: 0.2 } },
        'perso-jeu': { h: 11, perso: { at: [0, 4.5, Math.PI], absYaw: 0, dist: 'jeu', pitch: 'jeu', ty: 0.3 } },
        'perso-ponton': { h: 18, perso: { seat: 'ponton', yaw: 0.6, dist: 3.4, pitch: 0.22, ty: 0.1 } },
        'perso-nuit': { h: 22, perso: { at: [8.4, 2.4, 0.2], yaw: 0.45, dist: 3.2, pitch: 0.16, ty: 0.2 } },
      },
      // Cadrage centré sur le personnage (pose, siège, heure)
      async shotPerso(c, file) {
        const P = game.player;
        const ch = game.character;
        const o = c.perso;
        if (P.mode === 'seated') P.stand();
        if (o.seat === 'ponton') {
          game.interactions.get('pier').action();
        } else {
          P.place(o.at[0], o.at[1], o.at[2]);
          ch.setPose('idle');
        }
        if (P.seat) {
          P.pos.set(P.seat.x, P.seat.y, P.seat.z);
          P.facing = P.seat.facing;
        }
        P.vel.set(0, 0, 0);
        for (let i = 0; i < 90; i++) ch.update(1 / 60, 0);
        P.sync();
        const r = game.rig;
        r.mode = 'shot';
        const dist = o.dist === 'jeu' ? game.defaultCam.dist : o.dist;
        const pitch = o.pitch === 'jeu' ? game.defaultCam.pitch : o.pitch;
        const yaw = o.absYaw ?? P.facing + o.yaw;
        this.frame({ dist, pitch, yaw, tx: P.pos.x, tz: P.pos.z });
        r.target.y = r.focus.y = P.pos.y + o.ty;
        for (let i = 0; i < 40; i++) r.update(0.05);
        for (let i = 0; i < 4; i++) game.world.update(0.016, game.camera);
        await new Promise((res) => setTimeout(res, 120));
        await this.capture(file);
        r.mode = 'follow';
        return file;
      },
      async shot(name, file) {
        const c = this.cadrages[name];
        game.ui.closePanel(true);
        game.world.dayCycle.override = c.h;
        if (c.perso) return this.shotPerso(c, file || name);
        game.player.place(c.p[0], c.p[1], c.p[2]);
        // la caméra vise la cible du cadrage, pas le joueur
        game.rig.mode = 'shot';
        this.frame(c.cam);
        for (let i = 0; i < 40; i++) game.rig.update(0.05);
        for (let i = 0; i < 4; i++) game.world.update(0.016, game.camera);
        await new Promise((r) => setTimeout(r, 120));
        await this.capture(file || name);
        game.rig.mode = 'follow';
        return file || name;
      },
      async captureSet(prefix, filter = (n) => !n.startsWith('perso-')) {
        const out = [];
        for (const n of Object.keys(this.cadrages).filter(filter)) out.push(await this.shot(n, `${prefix}-${n}`));
        game.world.dayCycle.override = null;
        game.applySettings();
        return out;
      },
    };
  }
}
