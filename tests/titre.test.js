// Écran-titre : menu (étapes, curseur, confirmation), plans de caméra, thème au piano (partition et
// partiels), nouvelle partie, entrées clavier du titre (src/ui/titreLogic.js, src/audio/pianoTitre.js,
// src/app/Titre.js)
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LIEU_TITRE, PLANS, DUREE_PLANS, FONDU_PLAN, planAt, poseAt, voileAt, versMonde,
  entreesMenu, creerMenu, entreesVisibles, eveiller, deplacer, choisir, valider, retour, etatNouvellePartie,
} from '../src/ui/titreLogic.js';
import { MESURES, ACCORDS, GAMME, TEMPO, TEMPS, evenements, partiels, hz } from '../src/audio/pianoTitre.js';
import { Titre, titreAPasser } from '../src/app/Titre.js';
import { createDefaultState } from '../src/core/state.js';
import { ILE_BY_ID } from '../src/world/islands/regions.js';
import { ARCHIPEL } from '../src/world/archipel.js';

describe('menu du titre', () => {
  it('propose Continuer seulement quand une partie existe', () => {
    expect(entreesMenu(true)).toEqual(['continuer', 'nouvelle', 'options']);
    expect(entreesMenu(false)).toEqual(['nouvelle', 'options']);
    expect(creerMenu({ sauvegarde: false }).etape).toBe('intro');
  });

  it('le premier appui ouvre le menu sur la première entrée', () => {
    const m = eveiller({ ...creerMenu({ sauvegarde: true }), etape: 'attente' });
    expect(m.etape).toBe('menu');
    expect(m.curseur).toBe(0);
    expect(m.action).toBe('eveil');
    // valider pendant l'intro vaut aussi un éveil
    expect(valider(creerMenu()).action).toBe('eveil');
    // déjà ouvert : rien
    expect(eveiller(m).action).toBe(null);
  });

  it('le curseur fait le tour, le survol ne joue de son que s’il bouge', () => {
    let m = eveiller(creerMenu({ sauvegarde: true }));
    m = deplacer(m, -1);
    expect(m.curseur).toBe(2);
    m = deplacer(m, 1);
    expect(m.curseur).toBe(0);
    expect(choisir(m, 0).action).toBe(null);
    expect(choisir(m, 1)).toMatchObject({ curseur: 1, action: 'curseur' });
    // avant le menu, ni déplacement ni survol
    expect(deplacer(creerMenu(), 1).curseur).toBe(0);
  });

  it('Continuer et Nouvelle partie (sans partie) lancent le départ', () => {
    const avec = eveiller(creerMenu({ sauvegarde: true }));
    expect(valider(avec)).toMatchObject({ etape: 'depart', action: 'continuer' });
    const sans = eveiller(creerMenu({ sauvegarde: false }));
    expect(valider(sans)).toMatchObject({ etape: 'depart', action: 'nouvelle' });
  });

  it('effacer une partie demande confirmation, Annuler sous le curseur', () => {
    let m = deplacer(eveiller(creerMenu({ sauvegarde: true })), 1);
    m = valider(m);
    expect(m).toMatchObject({ etape: 'confirmer', curseur: 1, action: 'confirmer' });
    expect(entreesVisibles(m)).toEqual(['recommencer', 'annuler']);
    // Annuler (ou Échap) : retour au menu, sur « Nouvelle partie »
    expect(valider(m)).toMatchObject({ etape: 'menu', curseur: 1, action: 'annuler' });
    expect(retour(m)).toMatchObject({ etape: 'menu', curseur: 1 });
    // Tout effacer
    expect(valider(deplacer(m, -1))).toMatchObject({ etape: 'depart', action: 'nouvelle' });
  });

  it('Options ouvre les réglages ; à leur fermeture, retour sur Options', () => {
    let m = deplacer(deplacer(eveiller(creerMenu({ sauvegarde: true })), 1), 1);
    m = valider(m);
    expect(m).toMatchObject({ etape: 'options', action: 'options' });
    expect(retour(m)).toMatchObject({ etape: 'menu', curseur: 2 });
    // sans partie, Options est la deuxième entrée
    const s = valider(deplacer(eveiller(creerMenu()), 1));
    expect(retour(s).curseur).toBe(1);
  });

  it('une nouvelle partie repart d’un monde vierge en gardant les réglages', () => {
    const ancien = createDefaultState();
    ancien.player.x = 812;
    ancien.launches = 14;
    ancien.settings.quality = 'high';
    ancien.settings.volumes = { ...ancien.settings.volumes, music: 0.2 };
    const neuf = etatNouvellePartie(ancien);
    const vierge = createDefaultState();
    expect(neuf.player.x).toBe(vierge.player.x);
    expect(neuf.launches ?? 0).toBe(vierge.launches ?? 0);
    expect(neuf.settings.quality).toBe('high');
    expect(neuf.settings.volumes.music).toBe(0.2);
    // copie, pas partage
    ancien.settings.quality = 'low';
    expect(neuf.settings.quality).toBe('high');
  });
});

describe('plans de caméra', () => {
  it('les plans se suivent et bouclent', () => {
    expect(planAt(0).i).toBe(0);
    expect(planAt(PLANS[0].duree + 0.01).i).toBe(1);
    expect(planAt(DUREE_PLANS - 0.01).i).toBe(PLANS.length - 1);
    expect(planAt(DUREE_PLANS + 0.01).i).toBe(0);
    expect(DUREE_PLANS).toBeGreaterThan(50);
  });

  it('chaque plan part de « de » et arrive à « a », sans à-coup', () => {
    let t0 = 0;
    for (const P of PLANS) {
      expect(poseAt(t0 + 1e-6).cam[0]).toBeCloseTo(P.de.cam[0], 3);
      expect(poseAt(t0 + P.duree - 1e-6).cam[0]).toBeCloseTo(P.a.cam[0], 3);
      // pas de saut entre deux images à 60 i/s au milieu du plan
      const a = poseAt(t0 + P.duree / 2);
      const b = poseAt(t0 + P.duree / 2 + 1 / 60);
      for (let k = 0; k < 3; k++) expect(Math.abs(a.cam[k] - b.cam[k])).toBeLessThan(0.02);
      t0 += P.duree;
    }
  });

  it('fondu au papier autour de chaque coupe, image nette au milieu, pas de fondu à l’ouverture', () => {
    expect(voileAt(0)).toBe(0);
    expect(voileAt(PLANS[0].duree / 2)).toBe(0);
    expect(voileAt(PLANS[0].duree - 1e-3)).toBeGreaterThan(0.99);
    expect(voileAt(PLANS[0].duree + 1e-3)).toBeGreaterThan(0.99);
    expect(voileAt(PLANS[0].duree + FONDU_PLAN + 0.01)).toBe(0);
    // au retour du premier plan (boucle), le fondu d'entrée existe
    expect(voileAt(DUREE_PLANS + 1e-3)).toBeGreaterThan(0.99);
  });

  it('repère du héros : devant, à droite, au-dessus', () => {
    const est = { x: 10, y: 5, z: 20, cap: Math.PI / 2 };
    const p = versMonde([2, 3, 1], est);
    // regard vers l'est (+X) : sa droite est le sud (+Z)
    expect(p.x).toBeCloseTo(12, 6);
    expect(p.z).toBeCloseTo(23, 6);
    expect(p.y).toBe(6);
  });

  it('la caméra ne frôle jamais le héros et le Moulin du Large reste hors du cadre', () => {
    const gi = ILE_BY_ID.get('grande-ile');
    const pose = ARCHIPEL.islands.find((i) => i.id === 'grande-ile').poses.find((p) => p.nom === 'Moulin du Large');
    // repère de l'île → monde
    const moulin = { x: gi.x + pose.at[0], z: gi.z + pose.at[1] };
    expect(Math.hypot(moulin.x - LIEU_TITRE.x, moulin.z - LIEU_TITRE.z)).toBeLessThan(15);
    const hero = { x: LIEU_TITRE.x, y: 0, z: LIEU_TITRE.z, cap: LIEU_TITRE.cap };
    for (let t = 0; t < DUREE_PLANS; t += 0.25) {
      const P = poseAt(t);
      const c = versMonde(P.cam, hero);
      const v = versMonde(P.vise, hero);
      expect(Math.hypot(c.x - hero.x, c.z - hero.z)).toBeGreaterThan(2);
      // demi-angle horizontal d'un écran 16:9
      const demi = Math.atan(Math.tan((P.fov * Math.PI) / 360) * (16 / 9));
      const vise = Math.atan2(v.z - c.z, v.x - c.x);
      const versMoulin = Math.atan2(moulin.z - c.z, moulin.x - c.x);
      let d = Math.abs(versMoulin - vise);
      if (d > Math.PI) d = 2 * Math.PI - d;
      expect(d, `plan ${P.plan} à ${t} s`).toBeGreaterThan(demi + 0.05);
    }
  });
});

describe('thème au piano', () => {
  const { evenements: E, duree } = evenements();

  it('une boucle d’environ 1 min 20, à 3/4 et noire à 72', () => {
    expect(TEMPO).toBe(72);
    expect(TEMPS).toBe(3);
    // 32 mesures de 2,5 s, quelques ralentis en fin de phrase
    expect(MESURES.length).toBe(32);
    expect(duree).toBeGreaterThan(80);
    expect(duree).toBeLessThan(84);
  });

  it('événements triés, dans la tessiture du piano, vélocités raisonnables, toujours les mêmes', () => {
    for (let i = 1; i < E.length; i++) expect(E[i].t).toBeGreaterThanOrEqual(E[i - 1].t);
    for (const e of E) {
      expect(e.midi).toBeGreaterThanOrEqual(21);
      expect(e.midi).toBeLessThanOrEqual(108);
      expect(e.vel).toBeGreaterThan(0.05);
      expect(e.vel).toBeLessThanOrEqual(1);
      expect(e.fin).toBeGreaterThan(e.t);
      expect(e.t).toBeLessThan(duree);
    }
    expect(evenements()).toEqual(evenements());
  });

  it('chaque mesure a sa basse et son arpège ; la mélodie tient dans la mesure', () => {
    expect(E.filter((e) => e.voix === 'basse').length).toBe(MESURES.length);
    expect(E.filter((e) => e.voix === 'arpege').length).toBe(MESURES.length * 5);
    for (const M of MESURES) {
      expect(ACCORDS[M.accord], M.accord).toBeTruthy();
      expect(ACCORDS[M.accord].arpege.length).toBe(5);
      for (const [b, d] of M.melodie || []) {
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b + d).toBeLessThanOrEqual(TEMPS + 1e-9);
      }
    }
  });

  it('tout est en mi bémol majeur, sauf l’accord de sol (dominante de do mineur)', () => {
    for (const M of MESURES) {
      const A = ACCORDS[M.accord];
      const notes = [A.basse, ...A.arpege, ...(M.melodie || []).map((n) => n[2])];
      for (const m of notes) {
        if (M.accord === 'Sol' && m % 12 === 11) continue;
        expect(GAMME, `${M.accord} : ${m}`).toContain(m % 12);
      }
    }
    // la boucle part et revient sur la tonique
    expect(ACCORDS[MESURES[0].accord].basse % 12).toBe(3);
    expect(ACCORDS[MESURES.at(-1).accord].basse % 12).toBe(3);
  });

  it('partiels de piano : étirés vers l’aigu, plus courts en haut', () => {
    for (const midi of [34, 60, 84]) {
      const P = partiels(midi, 0.6);
      expect(P[0].f).toBeCloseTo(hz(midi), 0);
      for (let k = 1; k < P.length; k++) {
        // inharmonicité : chaque partiel un peu au-dessus du multiple exact
        expect(P[k].f).toBeGreaterThan(P[k].n * hz(midi));
        expect(P[k].tau).toBeLessThan(P[k - 1].tau);
        expect(P[k].a).toBeGreaterThan(0);
      }
      for (const p of P) expect(p.f).toBeLessThan(9000);
    }
    expect(partiels(84)[0].tau).toBeLessThan(partiels(40)[0].tau);
    // jouer fort éclaire le son
    expect(partiels(60, 0.9)[3].a).toBeGreaterThan(partiels(60, 0.3)[3].a);
  });
});

describe('entrées du titre', () => {
  afterEach(() => vi.unstubAllGlobals());

  const titre = (sauvegarde = true) => {
    const journal = [];
    const game = {
      audio: { resume() {}, jouerTheme: () => journal.push('theme'), menu: (k) => journal.push(`son:${k}`) },
      openSettings: () => journal.push('reglages'),
    };
    const T = new Titre(game, { sauvegarde });
    T.ecran = { etape() {}, majMenu() {}, montrerLogo() {} };
    T.partir = (mode) => journal.push(`partir:${mode}`);
    return { T, journal };
  };

  it('une touche ouvre le menu et lance le thème ; les raccourcis du navigateur passent', () => {
    const { T, journal } = titre();
    expect(T.touche('F5', {})).toBe(false);
    expect(T.touche('KeyR', { metaKey: true })).toBe(false);
    expect(T.touche('ShiftLeft', {})).toBe(false);
    expect(T.menu.etape).toBe('intro');
    expect(T.touche('KeyA', {})).toBe(true);
    expect(T.menu.etape).toBe('menu');
    expect(journal).toContain('theme');
  });

  it('flèches, ZQSD, Entrée et Échap ; une touche maintenue ne valide pas deux fois', () => {
    const { T, journal } = titre();
    T.touche('Space', {});
    T.touche('KeyS', {});
    expect(T.menu.curseur).toBe(1);
    T.touche('Enter', { repeat: true });
    expect(T.menu.etape).toBe('menu');
    T.touche('Enter', {});
    expect(T.menu.etape).toBe('confirmer');
    T.touche('Escape', {});
    expect(T.menu).toMatchObject({ etape: 'menu', curseur: 1 });
    T.touche('ArrowUp', {});
    T.touche('NumpadEnter', {});
    expect(journal).toContain('partir:continuer');
    // la partie n'a pas commencé : les autres touches ne vont pas au jeu
    expect(T.touche('KeyV', {})).toBe(true);
  });

  it('?titre=0 ou une nouvelle partie qui recharge la page : le titre est passé, une seule fois', () => {
    const store = new Map();
    const session = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    vi.stubGlobal('sessionStorage', session);
    vi.stubGlobal('location', { search: '?titre=0' });
    expect(titreAPasser()).toBe(true);
    vi.stubGlobal('location', { search: '' });
    expect(titreAPasser()).toBe(false);
    session.setItem('archipel:sans-titre', '1');
    expect(titreAPasser()).toBe(true);
    expect(titreAPasser()).toBe(false);
  });
});
