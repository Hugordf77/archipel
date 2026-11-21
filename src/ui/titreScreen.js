// Habillage de l'écran-titre : nom du jeu, « Appuyez sur une touche », menu, question de
// confirmation, aide des commandes et voile des coupes entre les plans. Aucune logique ici : Titre.js
// (src/app/) dit quoi montrer (étape, entrées, curseur) et reçoit les gestes de la souris.
import { h } from './dom.js';
import { LIBELLES } from './titreLogic.js';

// trait de pinceau sous le nom : une houle qui se dessine
const VAGUE = `<svg viewBox="0 0 320 24" aria-hidden="true"><path d="M6 14 C 40 4, 64 4, 92 13 S 146 23, 172 13 S 226 3, 254 12 S 300 20, 314 10" /></svg>`;

export class EcranTitre {
  // root : #ui ; gestes : onAppui (premier appui hors du menu), onSurvol(i), onChoix(i)
  constructor(root, { onAppui, onSurvol, onChoix }) {
    this.onSurvol = onSurvol;
    this.onChoix = onChoix;
    this.ids = [];
    // survol : seule une souris qui bouge déplace le curseur ; une liste qui change sous une souris
    // immobile (le menu devient la confirmation) ne choisit rien à sa place
    this.souris = { x: -1, y: -1 };
    this.figee = null;
    const lettres = [...'Archipel'].map((c, i) => h('span', { style: { '--i': i } }, c));
    this.voile = h('div', { class: 'titre-voile' });
    this.logo = h('header', { class: 'titre-logo' },
      h('h1', { class: 'titre-nom', 'aria-label': 'Archipel' }, lettres),
      h('div', { class: 'titre-trait', html: VAGUE }),
      h('p', { class: 'titre-sous' }, 'L’archipel des souvenirs'));
    this.invite = h('p', { class: 'titre-invite' }, 'Appuyez sur une touche');
    this.question = h('p', { class: 'titre-question' }, 'Une partie est en cours. Tout effacer pour recommencer ?');
    this.liste = h('div', { class: 'titre-liste', role: 'menu' });
    this.menu = h('nav', { class: 'titre-menu' }, this.question, this.liste);
    this.aide = h('p', { class: 'titre-aide' },
      h('span', {}, h('b', {}, '↑ ↓'), ' choisir'),
      h('span', {}, h('b', {}, 'Entrée'), ' / ', h('b', {}, '✕'), ' valider'),
      h('span', {}, h('b', {}, 'Échap'), ' / ', h('b', {}, '◯'), ' retour'));
    this.el = h('div', { class: 'titre-ecran', dataset: { etape: 'intro' } },
      this.voile, h('div', { class: 'titre-ombre' }), this.logo, this.invite, this.menu, this.aide);
    this.el.addEventListener('pointermove', (e) => {
      this.souris.x = e.clientX;
      this.souris.y = e.clientY;
    });
    // un clic n'importe où (hors du menu) vaut « une touche »
    this.el.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.titre-item')) onAppui();
    });
    root.prepend(this.el);
  }

  etape(e) {
    this.el.dataset.etape = e;
  }

  montrerLogo() {
    this.el.classList.add('logo-on');
  }

  // entrées (identifiants) et curseur ; la liste n'est reconstruite que si les entrées changent
  majMenu(ids, curseur) {
    if (ids.join() !== this.ids.join()) {
      this.ids = ids.slice();
      this.figee = { ...this.souris };
      this.liste.replaceChildren(...ids.map((id, i) => h('button', {
        class: 'titre-item',
        role: 'menuitem',
        dataset: { id },
        style: { '--i': i },
        onpointerenter: (e) => {
          const f = this.figee;
          if (f && Math.hypot(e.clientX - f.x, e.clientY - f.y) < 3) return;
          this.figee = null;
          this.onSurvol(i);
        },
        onclick: (e) => {
          // pas de « pop » générique des boutons de l'interface : le titre a ses propres sons
          e.stopPropagation();
          this.onChoix(i);
        },
      }, h('span', { class: 'titre-puce', 'aria-hidden': 'true' }, '✦'), h('span', {}, LIBELLES[id]))));
    }
    [...this.liste.children].forEach((b, i) => b.classList.toggle('actif', i === curseur));
  }

  setVoile(v) {
    this.voile.style.opacity = v.toFixed(3);
  }

  // le menu s'efface (départ de la partie) ; l'élément reste jusqu'à detruire()
  fermer() {
    this.el.classList.add('fin');
  }

  detruire() {
    this.el.remove();
  }
}
