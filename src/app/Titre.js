// Écran-titre (menu de démarrage) : le héros se tient sur le rebord est du Plateau venté, à l'aube, et
// regarde le large ; la caméra l'entoure en quatre plans lents enchaînés par un fondu au papier ; le
// vent du large soulève ses cheveux et son écharpe (physique existante du personnage, vent du monde
// forcé pendant le titre) ; thème au piano en boucle (src/audio/pianoTitre.js). Par-dessus : le nom du
// jeu, « Appuyez sur une touche », puis le menu (Continuer si une partie existe, Nouvelle partie,
// Options), au clavier, à la souris et à la manette.
//
// Pendant le titre, la partie n'avance pas : ni sauvegarde, ni découverte d'île, ni position du héros
// écrite dans l'état. Au départ, tout est rendu (heure, météo, vent, caméra) et le héros retrouve sa
// place sauvegardée sous un fondu au papier.
// Logique pure : src/ui/titreLogic.js ; habillage : src/ui/titreScreen.js.
import * as THREE from 'three';
import { U, ORIGIN } from '../core/globals.js';
import { groundAt, setGroundRef } from '../world/navigation.js';
// brise ressentie par les cheveux (VENT.brise) : présente selon la version du personnage ; sans elle,
// le vent du monde (uWindDir, uWindStrength) suffit à les animer
import * as CHEVEUX from '../entities/character/cheveux.js';
import { BTN } from '../core/Gamepad.js';
import { writeSave } from '../core/db.js';
import { EcranTitre } from '../ui/titreScreen.js';
import {
  LIEU_TITRE, poseAt, voileAt, versMonde, etatNouvellePartie,
  creerMenu, eveiller, deplacer, choisir, valider, retour, entreesVisibles,
} from '../ui/titreLogic.js';

const SANS_TITRE = 'archipel:sans-titre';

// Le titre est-il à passer ? ?titre=0 dans l'adresse (outils, captures), ou une nouvelle partie qui
// vient de recharger la page (une seule fois)
export function titreAPasser() {
  if (new URLSearchParams(location.search).get('titre') === '0') return true;
  try {
    if (sessionStorage.getItem(SANS_TITRE)) {
      sessionStorage.removeItem(SANS_TITRE);
      return true;
    }
  } catch {
    /* stockage de session indisponible */
  }
  return false;
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const HAUT = new Set(['ArrowUp', 'KeyW', 'Numpad8']);
const BAS = new Set(['ArrowDown', 'KeyS', 'Numpad2']);
const VALIDER = new Set(['Enter', 'NumpadEnter', 'Space']);
const RETOUR = new Set(['Escape', 'Backspace']);
const MODIFS = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'Tab']);

export class Titre {
  constructor(game, { sauvegarde = false } = {}) {
    this.game = game;
    this.menu = creerMenu({ sauvegarde });
    this.actif = true;
    this.t = 0;
    this.lieu = LIEU_TITRE;
    // aucune commande : le héros se tient immobile (pose de repos, physique des cheveux et de l'écharpe)
    this.intent = { move: new THREE.Vector3(), stick: { x: 0, y: 0 }, sprint: false, walk: false, jump: false, jumpHeld: false, roll: false };
    this._lf = new THREE.Vector3();
    this.minuteries = [];
  }

  // Avant le préchargement : le héros va sur le plateau, le monde est mis à l'heure du titre.
  // Renvoie le point autour duquel précharger les îles.
  preparer() {
    const g = this.game;
    const L = this.lieu;
    const r = g.rig;
    this.sauve = {
      brise: CHEVEUX.VENT?.brise,
      fov: g.camera.fov,
      rig: { yaw: r.yaw, pitch: r.pitch, distance: r.distance },
    };
    // la musique du jeu attend la fin du titre ; pas de découverte d'île depuis le plateau
    g.audio.retenirMusique();
    g.islands.decouvrir = false;
    g.world.dayCycle.override = L.heure;
    g.weather.setMode('clair');
    if (CHEVEUX.VENT) CHEVEUX.VENT.brise = L.vent.brise;
    g.recenter(L.x, L.z);
    setGroundRef(1e6);
    g.player.place(L.x, L.z, L.cap);
    g.player.vel.set(0, 0, 0);
    g.character.setPose('idle');
    g.character.sleepy = false;
    r.mode = 'shot';
    r.target.copy(g.player.pos);
    r.focus.copy(g.player.pos);
    // l'interface du jeu (heure, minicarte, barre rapide…) attend la partie
    g.uiRoot.dataset.titre = '1';
    this.vent();
    return { x: L.x, z: L.z };
  }

  // Après le préchargement, l'écran de chargement s'efface : le nom apparaît, puis l'invite
  ouvrir() {
    this.ecran = new EcranTitre(this.game.uiRoot, {
      onAppui: () => this.appliquer(eveiller(this.menu)),
      onSurvol: (i) => this.appliquer(choisir(this.menu, i)),
      onChoix: (i) => {
        this.appliquer(choisir(this.menu, i), true);
        this.appliquer(valider(this.menu));
      },
    });
    this.ecran.majMenu(entreesVisibles(this.menu), this.menu.curseur);
    this.plus(() => this.ecran.montrerLogo(), 1100);
    this.plus(() => {
      if (this.menu.etape === 'intro') this.appliquer({ ...this.menu, etape: 'attente', action: null });
    }, 3900);
  }

  plus(fn, ms) {
    this.minuteries.push(setTimeout(fn, ms));
  }

  // nouvel état du menu : sons, actions, affichage
  appliquer(m, silencieux = false) {
    this.menu = m;
    const g = this.game;
    const a = m.action;
    if (a === 'eveil') {
      // premier geste : le son peut naître (règle des navigateurs), le thème commence
      g.audio.resume();
      g.audio.jouerTheme();
      this.ecran.montrerLogo();
    } else if (a === 'curseur' && !silencieux) g.audio.menu('tick');
    else if (a === 'confirmer') g.audio.menu('open');
    else if (a === 'annuler') g.audio.menu('close');
    else if (a === 'options') {
      g.audio.menu('open');
      g.openSettings();
    } else if (a === 'continuer' || a === 'nouvelle') {
      g.audio.menu('open');
      this.partir(a);
    }
    this.ecran.etape(m.etape);
    this.ecran.majMenu(entreesVisibles(m), m.curseur);
  }

  // ---------------------------------------------------------------------------
  // Entrées
  touche(code, e) {
    // raccourcis du navigateur (F5, F12, ⌘R…) : laissés passer
    if (e.metaKey || e.ctrlKey || e.altKey || /^F\d+$/.test(code)) return false;
    const m = this.menu;
    if (m.etape === 'intro' || m.etape === 'attente') {
      if (MODIFS.has(code)) return false;
      this.appliquer(eveiller(m));
      return true;
    }
    if (m.etape !== 'menu' && m.etape !== 'confirmer') return true;
    if (HAUT.has(code)) this.appliquer(deplacer(m, -1));
    else if (BAS.has(code)) this.appliquer(deplacer(m, 1));
    else if (VALIDER.has(code)) {
      if (!e.repeat) this.appliquer(valider(m));
    } else if (RETOUR.has(code)) this.appliquer(retour(m));
    // la partie n'a pas commencé : aucune touche ne parvient au jeu
    return true;
  }

  // manette (Gamepad.dispatch, quand aucun panneau n'est ouvert)
  manette(pad, dt) {
    const m = this.menu;
    if (m.etape === 'intro' || m.etape === 'attente') {
      for (let b = 0; b <= BTN.TOUCHPAD; b++) {
        if (pad.pressed(b)) {
          this.appliquer(eveiller(m));
          return;
        }
      }
      return;
    }
    if (m.etape !== 'menu' && m.etape !== 'confirmer') return;
    let d = pad.pressed(BTN.UP) ? -1 : pad.pressed(BTN.DOWN) ? 1 : 0;
    if (!d) {
      const s = pad.stickNav(dt);
      if (s && s[1]) d = s[1];
    }
    if (d) this.appliquer(deplacer(this.menu, d));
    if (pad.pressed(BTN.CROSS)) {
      pad.rumble(0.08, 0.2, 40);
      this.appliquer(valider(this.menu));
    } else if (pad.pressed(BTN.CIRCLE)) this.appliquer(retour(this.menu));
  }

  // ---------------------------------------------------------------------------
  // Image du titre (appelée par Game.frame à la place de la boucle de jeu)
  frame(dt, rawDt) {
    const g = this.game;
    g.pad.poll(dt);
    // départ en cours : la partie se prépare sous le papier
    if (this.menu.etape === 'depart') return;
    // panneau des réglages refermé : retour au menu
    if (this.menu.etape === 'options' && !g.ui.panelOpen) this.appliquer(retour(this.menu));
    g.pipeline.adapt(rawDt * 1000);
    this.t += dt;
    this.vent();
    const P = g.player.pos;
    g.player.update(dt, this.intent);
    g.consumeLocoEvents();
    g.updateGrass(dt);
    this.cadrer();
    const lf = this._lf.set(P.x - ORIGIN.x, P.y, P.z - ORIGIN.z);
    g.islands.update(dt, P.x, P.z);
    g.ciel.update(dt);
    g.marine?.update(dt, P.x, P.z, { wind: U.uWindStrength.value, storm: false });
    g.world.followOcean(lf.x, lf.z);
    g.world.setHomeDetail(false);
    g.weather.update(dt, lf);
    g.world.rain = 0;
    g.world.update(dt, g.camera);
    // ambiance : le vent sur le plateau, la mer en contrebas, les oiseaux du matin
    g.audio.update(dt, { coast: 0.55, waterfall: 0, night: U.uNight.value, rain: 0, wind: 1 });
    if (this.ecran) this.ecran.setVoile(voileAt(this.t));
    g.pipeline.render(g.world.scene, g.camera, g.overlayScene);
  }

  // vent du large : direction fixe, force qui respire en rafales lentes
  vent() {
    const V = this.lieu.vent;
    const n = Math.hypot(V.dir[0], V.dir[1]) || 1;
    U.uWindDir.value.set(V.dir[0] / n, V.dir[1] / n);
    U.uWindStrength.value = V.force * (1 + 0.18 * Math.sin(this.t * 0.37) + 0.08 * Math.sin(this.t * 1.13 + 2));
  }

  // caméra : plan courant (titreLogic.poseAt), dans le repère du héros, jamais sous le sol
  cadrer() {
    const g = this.game;
    const P = g.player.pos;
    const hero = { x: P.x, y: P.y, z: P.z, cap: this.lieu.cap };
    const pose = poseAt(this.t);
    const c = versMonde(pose.cam, hero);
    const v = versMonde(pose.vise, hero);
    // caméra portée à la main, à peine : elle flotte de quelques centimètres
    c.x += Math.sin(this.t * 0.53) * 0.04;
    c.y += Math.sin(this.t * 0.71 + 1) * 0.03;
    c.z += Math.sin(this.t * 0.37 + 2) * 0.04;
    c.y = Math.max(c.y, groundAt(c.x, c.z).y + 0.45);
    const cam = g.camera;
    if (Math.abs(cam.fov - pose.fov) > 0.01) {
      cam.fov = pose.fov;
      cam.updateProjectionMatrix();
    }
    cam.position.set(c.x - ORIGIN.x, c.y - ORIGIN.y, c.z - ORIGIN.z);
    cam.lookAt(v.x - ORIGIN.x, v.y - ORIGIN.y, v.z - ORIGIN.z);
    cam.updateMatrixWorld();
  }

  // ---------------------------------------------------------------------------
  // Départ
  async partir(mode) {
    const g = this.game;
    for (const id of this.minuteries) clearTimeout(id);
    const efface = mode === 'nouvelle' && this.menu.sauvegarde;
    g.audio.arreterTheme(efface ? 1.2 : 3);
    this.ecran.fermer();
    g.fade.classList.add('on');
    await attendre(650);
    if (efface) {
      // nouvelle partie à la place de l'ancienne : monde vierge, réglages gardés ; la page recharge
      // et passe le titre une fois
      g.skipSave = true;
      await writeSave(etatNouvellePartie(g.state));
      try {
        sessionStorage.setItem(SANS_TITRE, '1');
      } catch {
        /* stockage de session indisponible : le titre s'affichera de nouveau */
      }
      location.reload();
      return;
    }
    await this.terminer(true);
  }

  // rend le monde à la partie et y ramène le héros ; avecFondu : sous le papier, îles préchargées
  async terminer(avecFondu) {
    const g = this.game;
    this.menu = { ...this.menu, etape: 'depart', action: null };
    for (const id of this.minuteries) clearTimeout(id);
    this.restaurer();
    const p = g.state.player;
    g.recenter(p.x, p.z);
    setGroundRef(Number.isFinite(p.y) ? p.y + 1 : 0);
    g.player.place(p.x, p.z, Math.PI);
    g.player.vel.set(0, 0, 0);
    g.character.setPose('idle');
    const r = g.rig;
    const S = this.sauve.rig;
    r.mode = 'follow';
    r.yaw = r.cur.yaw = S.yaw;
    r.pitch = r.cur.pitch = S.pitch;
    r.distance = r.cur.distance = S.distance;
    r.target.copy(g.player.pos);
    r.focus.copy(g.player.pos);
    g.input.taps.clear();
    if (avecFondu) {
      g.fade.dataset.texte = 'L’archipel se dessine…';
      await g.islands.preload(p.x, p.z);
    }
    this.actif = false;
    this.ecran?.detruire();
    g.titre = null;
    g.demarrerPartie();
    if (avecFondu) {
      delete g.fade.dataset.texte;
      g.fade.classList.remove('on');
      setTimeout(() => g.audio.libererMusique(4), 900);
    } else g.audio.libererMusique(0);
  }

  restaurer() {
    const g = this.game;
    g.applySettings();
    g.weather.setMode(g.state.settings.weather);
    if (CHEVEUX.VENT) CHEVEUX.VENT.brise = this.sauve.brise;
    g.camera.fov = this.sauve.fov;
    g.camera.updateProjectionMatrix();
    g.islands.decouvrir = true;
    delete g.uiRoot.dataset.titre;
  }

  // outils de développement : la partie commence tout de suite, sans fondu ni thème
  passer() {
    if (!this.actif || this.menu.etape === 'depart') return;
    this.game.audio.arreterTheme(0.1);
    this.terminer(false);
  }
}
