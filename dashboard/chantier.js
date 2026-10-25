// Chantier de l'open world : carte de l'archipel avec l'état de production de chaque zone, fiche de
// zone, manques, centre de production, agents, validation et assets. Tout est recalculé depuis le
// journal (production/journal.jsonl) avec les modules de src/production/ : aucune couleur ni
// pourcentage n'est saisi à la main. Avec le serveur de dev, les actions écrivent dans le journal
// (POST /__production) et la vue se rafraîchit ; sans lui, la page montre l'instantané compilé, en
// lecture seule.
import zonesData from '../production/zones.json';
import agentsData from '../production/agents.json';
import journalBrut from '../production/journal.jsonl?raw';
import { contexte, rejouer, etatItem } from '../src/production/etat.js';
import { bilanMonde } from '../src/production/completude.js';
import { STATUTS_ZONE, PRODUCTION, VALIDATION, INTEGRATION, PRIORITES, SPECIFICATION, CONTROLE } from '../src/production/statuts.js';
import { SECTIONS } from '../src/production/checklist.js';
import { CONTROLES } from '../src/production/contrats.js';
import { ARCHIPEL, ZONES, ZONE_BY_ID, PX, ORIGINE } from '../src/world/archipel.js';
import { ILES } from '../src/world/islands/regions.js';
import { islandContext, islandHeight } from '../src/world/islands/islandgen.js';
import { BIOMES } from '../src/world/islands/biomes.js';
import { heightAt } from '../src/world/home/terrain.js';
import * as registry from '../src/models/registry.js';
import carteReference from './reference/carte-souvenirs.webp';

const fiches = import.meta.glob('../production/fiches/*.json', { eager: true, import: 'default' });
const inventaires = import.meta.glob('../production/assets/*.json', { eager: true, import: 'default' });
const parZone = (glob) => Object.fromEntries(Object.entries(glob).map(([p, v]) => [p.split('/').at(-1).replace('.json', ''), v]));
const FICHES = parZone(fiches);
const INVENTAIRES = parZone(inventaires);

const ctx = contexte(zonesData, agentsData);
const esc = (v = '') => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
const date = (iso) => (iso ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—');
const roleLabel = (id) => ctx.roleParId.get(id)?.role || (id === 'humain' ? 'Humain' : id);
// emprise du monde ouvert (m) ; nord = −Z, comme la carte du jeu
const B = { x: ARCHIPEL.bounds.minX, z: ARCHIPEL.bounds.minZ, w: ARCHIPEL.bounds.maxX - ARCHIPEL.bounds.minX, h: ARCHIPEL.bounds.maxZ - ARCHIPEL.bounds.minZ };
// la carte de référence (1 536 × 1 024 pixels) dont le monde a été tracé, posée à 4 m par pixel
const REF = { x: -ORIGINE[0] * PX, z: -ORIGINE[1] * PX, w: 1536 * PX, h: 1024 * PX };

// ── données : serveur de dev, sinon instantané compilé ──────────────────────────────────────────
const donnees = { evenements: [], integrite: [], source: 'instantane', erreur: null, version: null };
function lireInstantane() {
  try {
    donnees.evenements = journalBrut.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch (err) {
    donnees.erreur = `Journal illisible : ${err.message}`;
  }
}
async function charger() {
  try {
    const r = await fetch('/__production', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    Object.assign(donnees, { evenements: j.evenements, integrite: j.integrite || [], source: 'serveur', version: j.version, erreur: null });
  } catch {
    if (donnees.source !== 'serveur') lireInstantane();
    else donnees.erreur = 'Serveur de dev injoignable : dernière lecture affichée.';
  }
}

// ── silhouettes réelles des îles (même relief que le jeu et que la carte M) ──────────────────────
let fondMonde = null;
function dessinerFond() {
  if (fondMonde) return fondMonde;
  if (typeof document === 'undefined') return ''; // tests sans DOM : pas de fond
  const px = 10; // mètres par pixel du fond
  const W = Math.round(B.w / px);
  const H = Math.round(B.h / px);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#dbe8ec';
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  const peindre = (cx, cz, ext, hauteur) => {
    const i0 = Math.max(0, Math.floor((cx - ext - B.x) / px));
    const i1 = Math.min(W - 1, Math.ceil((cx + ext - B.x) / px));
    const j0 = Math.max(0, Math.floor((cz - ext - B.z) / px));
    const j1 = Math.min(H - 1, Math.ceil((cz + ext - B.z) / px));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const h = hauteur(B.x + (i + 0.5) * px - cx, B.z + (j + 0.5) * px - cz);
        let col = null;
        if (h > 60) col = [176, 166, 148];
        else if (h > 1.3) col = [198, 207, 160];        else if (h > -0.3) col = [236, 222, 186];
        else if (h > -2.5) col = [200, 224, 227];
        if (!col) continue;
        const k = (j * W + i) * 4;
        img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
      }
    }
  };
  for (const d of ILES) {
    const ic = islandContext(d);
    peindre(d.x, d.z, d.forme ? ic.ext : d.r * 1.38, (x, z) => islandHeight(ic, x, z));
  }
  peindre(0, 0, 40, (x, z) => heightAt(x, z));
  g.putImageData(img, 0, 0);
  // îles du ciel : disques (elles flottent, sans relief au niveau de la mer)
  g.fillStyle = "#c6cfa0";
  for (const ci of ARCHIPEL.ciel) { g.beginPath(); g.arc((ci.x - B.x) / px, (ci.z - B.z) / px, ci.r / px, 0, Math.PI * 2); g.fill(); }
  fondMonde = c.toDataURL();
  return fondMonde;
}

// formes d'une zone dans le monde : les aires (ellipses) de ses zones du jeu, Ton île en cercle
function formes(zone) {
  return (zone.jeu?.zones || []).map((id) => {
    if (id === 'home') return { x: ARCHIPEL.home.x, z: ARCHIPEL.home.z, rx: 90, rz: 90, lx: 0, lz: 0, zoneJeu: id, nom: ARCHIPEL.home.name };
    const zj = ZONE_BY_ID.get(id);
    return { x: zj.x, z: zj.z, rx: zj.rx, rz: zj.rz, lx: zj.lx, lz: zj.lz, zoneJeu: id, nom: zj.name };
  });
}
// point d'étiquette : celui de la première zone du jeu (le nom affiché par la carte M)
const centre = (zone) => {
  const f = formes(zone).filter((x) => x.zoneJeu !== 'home');
  const a = f[0] || formes(zone)[0];
  return a ? { x: a.lx, z: a.lz } : null;
};

// ── état de l'interface ─────────────────────────────────────────────────────────────────────────
const ui = { vue: 'monde', manques: false, statut: '', priorite: '', agent: '', categorie: '', q: '', zone: null, onglet: 'checklist', occupe: false, message: null };
let modele = null;

function calculer() {
  const { etat, erreurs } = rejouer(donnees.evenements, ctx);
  const monde = bilanMonde(etat, ctx);
  modele = { etat, erreurs, monde, bilan: new Map(monde.zones.map((b) => [b.zone, b])) };
}

// assets d'une zone : modèles du registre des espèces que la génération y place (arbres et décor de
// chaque zone du jeu, sinon ceux de son biome), reliés par leur référence « kind: »
const PAR_REF = new Map(registry.MODELS.filter((m) => m.ref).map((m) => [m.ref, m]));
function especesDe(id) {
  const zj = ZONE_BY_ID.get(id);
  if (!zj) return [];
  const table = zj.arbres || (BIOMES[zj.biome]?.veg || []);
  return [...table, ...(zj.decor || [])].map((e) => e[0]);
}
export function assetsDeZone(zone) {
  const ids = new Set((zone.jeu?.zones || []).flatMap(especesDe).map((sp) => PAR_REF.get(`kind:${sp}`)?.id).filter(Boolean));
  return registry.MODELS.filter((m) => ids.has(m.id));
}
function zonesDeModele(m) {
  return ctx.zones.filter((z) => assetsDeZone(z).includes(m));
}

function zoneVisible(zone) {
  const b = modele.bilan.get(zone.id);
  if (ui.statut && b.statut !== ui.statut) return false;
  if (ui.priorite && zone.priorite !== ui.priorite) return false;
  if (ui.agent && !b.manquants.some((m) => m.agent === ui.agent) && !b.taches.some((id) => modele.etat.taches.get(id).assigned_agent === ui.agent)) return false;
  if (ui.categorie && !b.manquants.some((m) => m.section === ui.categorie)) return false;
  if (ui.manques && !b.manquants.length && !b.bloques.length) return false;
  if (ui.q) {
    const q = ui.q.toLowerCase();
    const enZone = `${zone.nom} ${zone.id} ${zone.description}`.toLowerCase().includes(q);
    const parAsset = registry.MODELS.some((m) => (m.id.toLowerCase() === q || m.name.toLowerCase().includes(q)) && zonesDeModele(m).includes(zone));
    if (!enZone && !parAsset) return false;
  }
  return true;
}

// ── carte ───────────────────────────────────────────────────────────────────────────────────────
const MOTIFS = `
  <pattern id="m-hachures" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="60" height="60" fill="#7d1f24" fill-opacity=".35"/><line x1="0" y1="0" x2="0" y2="60" stroke="#7d1f24" stroke-width="26"/></pattern>
  <pattern id="m-plein-rouge" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#d2343b" fill-opacity=".22"/></pattern>
  <pattern id="m-tirets" width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="70" height="70" fill="#e58a2e" fill-opacity=".18"/><line x1="0" y1="35" x2="38" y2="35" stroke="#e58a2e" stroke-width="14"/></pattern>
  <pattern id="m-points" width="54" height="54" patternUnits="userSpaceOnUse"><rect width="54" height="54" fill="#7f58c4" fill-opacity=".22"/><circle cx="27" cy="27" r="11" fill="#7f58c4"/></pattern>
  <pattern id="m-contour" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#5fae7f" fill-opacity=".22"/></pattern>
  <pattern id="m-jouable" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#1f8a5b" fill-opacity=".3"/></pattern>
  <marker id="fleche" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#3b4a58"/></marker>`;
const REMPLI = { bloquee: 'url(#m-hachures)', en_construction: 'url(#m-plein-rouge)', partielle: 'url(#m-tirets)', en_validation: 'url(#m-points)', validee: 'url(#m-contour)', jouable: 'url(#m-jouable)', non_commencee: 'none' };
const TRAIT = { non_commencee: '6 10', partielle: '18 10', validee: '0', bloquee: '0', en_construction: '0', en_validation: '4 6', jouable: '0' };

// Carte en coordonnées du jeu (mètres, nord = −Z). Fond : les silhouettes calculées par le générateur
// (vue « monde ») ou la carte de référence dont le monde a été tracé, à 4 m par pixel (vue
// « reference ») ; les aires des zones du jeu par-dessus, avec le statut calculé de leur zone du checklist.
function svgCarte() {
  const sel = ui.zone && ctx.zoneParId.get(ui.zone);
  const liens = [];
  const vus = new Set();
  for (const z of ctx.zones) {
    const a = centre(z);
    for (const c of z.connexions) {
      const k = [z.id, c].sort().join('|');
      const p = centre(ctx.zoneParId.get(c));
      if (vus.has(k) || !a || !p) continue;
      vus.add(k);
      liens.push(`<line x1="${a.x}" y1="${a.z}" x2="${p.x}" y2="${p.z}" class="lien-zone"/>`);
    }
  }
  // dépendances de la zone sélectionnée : flèches entrantes (elle attend) et sortantes (on l'attend)
  const deps = [];
  if (sel) {
    const c = centre(sel);
    for (const d of sel.dependances) { const p = centre(ctx.zoneParId.get(d.zone)); if (p && c) deps.push(`<line x1="${p.x}" y1="${p.z}" x2="${c.x}" y2="${c.z}" class="dep-entrante" marker-end="url(#fleche)"/>`); }
    for (const id of modele.bilan.get(sel.id).dependants) { const p = centre(ctx.zoneParId.get(id)); if (p && c) deps.push(`<line x1="${c.x}" y1="${c.z}" x2="${p.x}" y2="${p.z}" class="dep-sortante" marker-end="url(#fleche)"/>`); }
  }
  const groupes = ctx.zones.map((z) => {
    const b = modele.bilan.get(z.id);
    const st = STATUTS_ZONE[b.statut];
    const c = centre(z);
    const fs = formes(z);
    if (!c) return '';
    const label = `${z.nom}, ${st.label}, production ${pct(b.scores.production)}, jouable ${pct(b.scores.jouable)}${b.manquants.length ? `, ${b.manquants.length} manques obligatoires` : ''}`;
    const noms = fs.map((f) => f.nom).join(', ');
    return `<g class="zone-carte ${zoneVisible(z) ? '' : 'estompee'} ${ui.zone === z.id ? 'choisie' : ''}" data-zone="${z.id}" data-statut="${b.statut}" tabindex="0" role="button" aria-label="${esc(label)}">
      <title>${esc(`${label} — zones du jeu : ${noms}`)}</title>
      ${fs.map((f) => `<ellipse cx="${f.x}" cy="${f.z}" rx="${f.rx}" ry="${f.rz}" fill="${REMPLI[b.statut]}" stroke="${st.couleur}" stroke-width="${b.statut === 'validee' || ui.zone === z.id ? 26 : 16}" stroke-dasharray="${TRAIT_MONDE[b.statut]}"/>`).join('')}
      <g transform="translate(${c.x} ${c.z})" class="etiquette">
        <text class="etiquette-nom" text-anchor="middle">${esc(st.icone)} ${esc(z.nom)}</text>
        <text class="etiquette-detail" text-anchor="middle" y="95">${esc(st.label)} · ${pct(b.scores.production)}</text>
      </g>
    </g>`;
  }).join('');
  const fond = ui.vue === 'monde'
    ? `<image href="${dessinerFond()}" x="${B.x}" y="${B.z}" width="${B.w}" height="${B.h}" preserveAspectRatio="none"/>`
    : `<image href="${carteReference}" x="${REF.x}" y="${REF.z}" width="${REF.w}" height="${REF.h}" preserveAspectRatio="none"/>`;
  return `<svg class="carte-svg ${ui.vue}" viewBox="${B.x} ${B.z} ${B.w} ${B.h}" role="group" aria-label="Carte de l’archipel des souvenirs en coordonnées du jeu">
    <defs>${MOTIFS}</defs>${fond}
    <rect x="${B.x}" y="${B.z}" width="${B.w}" height="${B.h}" class="limite-monde"/>
    ${liens.join('')}${groupes}${deps.join('')}
  </svg>`;
}
const TRAIT_MONDE = Object.fromEntries(Object.entries(TRAIT).map(([k, v]) => [k, v === '0' ? '0' : v.split(' ').map((n) => n * 4).join(' ')]));

function legende() {
  return `<ul class="legende" aria-label="Légende des statuts (cliquer pour filtrer)">${Object.entries(STATUTS_ZONE).map(([k, s]) => `<li><button class="filtre-statut ${ui.statut === k ? 'actif' : ''}" data-action="statut" data-valeur="${k}" aria-pressed="${ui.statut === k}"><svg width="22" height="16" aria-hidden="true"><rect x="2" y="2" width="18" height="12" rx="3" fill="${REMPLI[k] === 'none' ? '#fff' : REMPLI[k]}" stroke="${s.couleur}" stroke-width="2" stroke-dasharray="${TRAIT[k] === '0' ? '0' : '4 2'}"/></svg><span>${s.icone} ${esc(s.label)}</span><b>${modele.monde.parStatut[k]}</b></button></li>`).join('')}</ul>`;
}

// ── fiche de zone ───────────────────────────────────────────────────────────────────────────────
const actif = () => donnees.source === 'serveur';
const bouton = (action, attrs, texte, cls = '') => (actif() ? `<button class="btn ${cls}" data-action="${action}" ${attrs} ${ui.occupe ? 'disabled' : ''}>${texte}</button>` : '');
const puce = (axe, v) => `<span class="puce ${axe}-${v}">${esc({ production: PRODUCTION, validation: VALIDATION, integration: INTEGRATION, specification: SPECIFICATION }[axe][v] || v)}</span>`;

function carteTache(t, complet = false) {
  const actions = [
    t.status === 'ready' ? bouton('demarrer', `data-task="${t.task_id}"`, 'Démarrer') : '',
    ['review', 'completed'].includes(t.status) && t.validation_status !== 'running' ? bouton('valider', `data-task="${t.task_id}"`, 'Relancer la validation') : '',
    t.status === 'review' && t.validation_status === 'passed' ? bouton('revue-accepter', `data-task="${t.task_id}"`, 'Accepter (humain)', 'primary') : '',
    t.status === 'review' ? bouton('revue-refuser', `data-task="${t.task_id}"`, 'Refuser…') : '',
    t.status === 'completed' && ['integration_ready', 'integration_failed'].includes(t.integration_status) ? bouton('integrer', `data-task="${t.task_id}"`, 'Intégrer', 'primary') : '',
    t.status === 'blocked' ? bouton('debloquer', `data-task="${t.task_id}"`, 'Débloquer (humain)') : '',
    bouton('brief', `data-task="${t.task_id}"`, 'Brief'),
  ].join('');
  const v = t.validations.length ? modele.etat.validations.get(t.validations.at(-1)) : null;
  return `<article class="tache-carte statut-${t.status}" data-tache="${t.task_id}">
    <header><span class="model-id">${esc(t.task_id)}</span><span class="agent-puce">${esc(roleLabel(t.assigned_agent))}</span><span class="prio">${esc(t.priority)}</span></header>
    <h4>${esc(t.title)}</h4>
    <div class="puces">${puce('production', t.status)}${puce('validation', t.validation_status)}${puce('integration', t.integration_status)}${t.retry_count ? `<span class="puce tentatives">tentatives ${t.retry_count}</span>` : ''}</div>
    ${t.blocage ? `<p class="blocage">⛔ ${esc(t.blocage.raison)}</p>` : ''}
    ${t.dependencies.length ? `<p class="deps">Attend : ${t.dependencies.map((d) => `<code>${esc(d)}</code> (${esc(PRODUCTION[modele.etat.taches.get(d).status])})`).join(', ')}</p>` : ''}
    ${t.defauts.length ? `<ul class="defauts">${t.defauts.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    ${complet && v ? `<details><summary>Contrôles ${esc(v.validation_id)} · ${esc(VALIDATION[v.resultat] || v.resultat)}</summary><ul class="controles">${v.controles.map((c) => `<li class="c-${c.statut}"><b>${esc(CONTROLE[c.statut])}</b> ${esc(c.controle)} — ${esc(c.detail)}${c.commande ? ` <code>${esc(c.commande)}</code>` : ''}</li>`).join('')}</ul></details>` : ''}
    ${complet ? `<details><summary>Critères d’acceptation (${t.acceptance_criteria.length})</summary><ul>${t.acceptance_criteria.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details><details><summary>Livrables attendus</summary><ul>${t.expected_deliverables.map((d) => `<li><code>${esc(d.path)}</code> · ${esc(d.nature)}${t.livrables.map((id) => modele.etat.livrables.get(id)).filter((l) => l.path === d.path && !l.remplace_par).map((l) => ` · ${esc(l.deliverable_id)} v${l.version} ${puce('validation', l.validation)}`).join('')}</li>`).join('')}</ul></details>` : ''}
    ${t.revues.length && complet ? `<p class="note">Dernière revue : ${esc(t.revues.at(-1).relecteur)} · ${esc(t.revues.at(-1).decision)}${t.revues.at(-1).commentaire ? ` — ${esc(t.revues.at(-1).commentaire)}` : ''}</p>` : ''}
    <div class="tache-actions">${actions}</div>
  </article>`;
}

function ficheZone(zone) {
  const b = modele.bilan.get(zone.id);
  const st = STATUTS_ZONE[b.statut];
  const items = ctx.items.filter((i) => i.zone_id === zone.id).map((d) => ({ d, s: etatItem(modele.etat, ctx, d.id) }));
  const taches = b.taches.map((id) => modele.etat.taches.get(id));
  const fiche = FICHES[zone.id];
  const inv = INVENTAIRES[zone.id];
  const dispo = assetsDeZone(zone);
  const histo = modele.etat.evenements.filter((e) => JSON.stringify(e.donnees).includes(zone.id)).slice(-25).reverse();
  const onglets = { checklist: 'Checklist', manques: `Manques (${b.manquants.length})`, taches: `Tâches (${taches.length})`, assets: 'Assets', tests: 'Tests et QA', deps: 'Dépendances', historique: 'Historique' };
  let corps = '';
  if (ui.onglet === 'checklist') {
    corps = Object.entries(SECTIONS).map(([s, def]) => {
      const els = items.filter((x) => x.d.section === s);
      return `<details ${s === 'B' ? 'open' : ''}><summary><b>${s} · ${esc(def.label)}</b> <span>${els.filter((x) => x.d.obligatoire && x.s.production === 'completed').length}/${els.filter((x) => x.d.obligatoire).length} obligatoires faits</span></summary>
        <table class="work-table checklist"><thead><tr><th>Élément</th><th>Statuts</th><th>Responsable</th><th>Critère · vérification</th></tr></thead><tbody>${els.map(({ d, s: st2 }) => `<tr id="item-${d.id}" class="${d.obligatoire ? 'obligatoire' : 'optionnel'}"><td><span class="model-id">${esc(d.cle)}</span> <b>${esc(d.titre)}</b>${d.critique ? ' <span class="puce critique">critique</span>' : ''}${d.obligatoire ? '' : ' <small>(optionnel)</small>'}</td><td class="puces">${puce('specification', st2.specification)}${puce('production', st2.production)}${puce('validation', st2.validation)}${puce('integration', st2.integration)}</td><td>${esc(roleLabel(d.role))}${st2.taches.length ? `<br><code>${st2.taches.map(esc).join(', ')}</code>` : ''}</td><td>${esc(d.critere)}<br><small>${esc(d.verification)} · ${esc(d.preuve)}</small>${st2.preuves.length ? `<br><small class="preuve">Preuve : ${esc(st2.preuves.at(-1).preuve)}</small>` : ''}</td></tr>`).join('')}</tbody></table></details>`;
    }).join('');
  } else if (ui.onglet === 'manques') {
    corps = b.manquants.length ? `<ul class="liste-manques">${b.manquants.map((m) => `<li class="${m.critique ? 'critique' : ''} ${m.bloque ? 'bloque' : ''}"><div><span class="model-id">${esc(m.item)}</span> <b>${esc(m.titre)}</b> <small>${esc(m.categorie)}</small></div><p>${esc(m.pourquoi)}. Critère : ${esc(m.critere)}.</p><p>Responsable : <b>${esc(roleLabel(m.agent))}</b> · ${m.tache ? `tâche <code>${esc(m.tache)}</code> (${esc(PRODUCTION[modele.etat.taches.get(m.tache).status])})` : '<b class="sans-tache">aucune tâche</b>'}${m.bloque ? ' · ⛔ bloqué' : ''}</p></li>`).join('')}</ul>` : '<p class="empty-panel">Aucun élément obligatoire manquant.</p>';
  } else if (ui.onglet === 'taches') {
    corps = taches.length ? `<div class="taches-liste">${taches.map((t) => carteTache(t, true)).join('')}</div>` : '<p class="empty-panel">Aucune tâche pour cette zone. Lancez un chantier pour que l’orchestrateur les crée.</p>';
    corps += formulaireTache(zone, b);
  } else if (ui.onglet === 'assets') {
    corps = `<div class="assets-grille">
      <section><h4>Disponibles et intégrés (${dispo.length})</h4><p class="note">Espèces que la génération place dans ${esc((zone.jeu.zones || []).join(', ') || 'aucune zone du jeu')} (arbres et décor de chaque zone d’archipel.js, sinon ceux du biome), reliées au registre.</p><ul class="assets">${dispo.map((m) => `<li><span class="model-id">${esc(m.id)}</span> ${esc(m.name)} <span class="puce">${esc(registry.STATUTS[m.status] || m.status)}</span></li>`).join('') || '<li class="empty-panel">Aucun.</li>'}</ul></section>
      <section><h4>Attendus (inventaire de l’Asset Artist)</h4>${inv ? `<p class="note">${inv.existants.length} existants réutilisés, ${inv.manquants.length} manquants spécifiés.</p><ul class="assets">${inv.manquants.map((m) => `<li><span class="model-id">${esc(m.id_propose)}</span> ${esc(m.description)} <span class="puce">${esc(m.statut)}</span></li>`).join('')}</ul>` : '<p class="empty-panel">Inventaire pas encore produit (élément D10).</p>'}</section></div>`;
  } else if (ui.onglet === 'tests') {
    const vals = taches.flatMap((t) => t.validations.map((id) => modele.etat.validations.get(id)));
    const ints = taches.flatMap((t) => t.integrations.map((id) => modele.etat.integrations.get(id)));
    const cls = (r) => (r === 'passed' || r === 'integrated' ? 'reussi' : r === 'failed' || r === 'integration_failed' ? 'echoue' : 'non_execute');
    corps = `<h4>Validations (${vals.length})</h4>${vals.length ? `<ul class="controles">${vals.map((v) => `<li class="c-${cls(v.resultat)}"><b>${esc(v.validation_id)}</b> ${esc(VALIDATION[v.resultat] || v.resultat)} · ${date(v.fin || v.debut)}<ul>${v.controles.map((c) => `<li class="c-${c.statut}">${esc(CONTROLE[c.statut])} · ${esc(c.controle)} — ${esc(c.detail)}</li>`).join('')}</ul></li>`).join('')}</ul>` : '<p class="empty-panel">Aucune validation exécutée.</p>'}
      <h4>Intégrations (${ints.length})</h4>${ints.length ? `<ul class="controles">${ints.map((i) => `<li class="c-${cls(i.resultat)}"><b>${esc(i.integration_id)}</b> ${esc(INTEGRATION[i.resultat] || i.resultat)} · version <code>${esc(i.version)}</code><ul>${(i.preuves || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></li>`).join('')}</ul>` : '<p class="empty-panel">Aucune intégration.</p>'}
      <h4>Problèmes de QA</h4>${taches.some((t) => t.echecs.length) ? `<ul class="defauts">${taches.flatMap((t) => t.echecs.map((e) => `<li><code>${esc(t.task_id)}</code> ${date(e.at)} : ${e.defauts.map(esc).join(' ; ')}</li>`)).join('')}</ul>` : '<p class="empty-panel">Aucun échec enregistré.</p>'}`;
  } else if (ui.onglet === 'deps') {
    corps = `<h4>Cette zone attend</h4>${zone.dependances.length ? `<ul>${zone.dependances.map((d) => { const bz = modele.bilan.get(d.zone); return `<li><button class="lien" data-action="zone" data-zone="${d.zone}">${esc(ctx.zoneParId.get(d.zone).nom)}</button> — ${esc(d.raison)} · ${esc(STATUTS_ZONE[bz.statut].label)}</li>`; }).join('')}</ul>` : '<p class="empty-panel">Aucune dépendance.</p>'}
      <h4>Zones qui l’attendent (${b.dependants.length})</h4>${b.dependants.length ? `<ul>${b.dependants.map((id) => `<li><button class="lien" data-action="zone" data-zone="${id}">${esc(ctx.zoneParId.get(id).nom)}</button></li>`).join('')}</ul>` : '<p class="empty-panel">Aucune.</p>'}
      <h4>Connexions</h4><p>${zone.connexions.map((c) => `<button class="lien" data-action="zone" data-zone="${c}">${esc(ctx.zoneParId.get(c).nom)}</button>`).join(' · ')}</p>`;
  } else {
    corps = histo.length ? `<ol class="historique">${histo.map((e) => `<li><time>${date(e.at)}</time> <code>${esc(e.id)}</code> ${esc(libelle(e))} <small>par ${esc(e.acteur)}</small></li>`).join('')}</ol>` : '<p class="empty-panel">Aucun événement pour cette zone.</p>';
  }
  const fi = fiche ? `<p class="note">Fiche de zone : <code>production/fiches/${esc(zone.id)}.json</code> · ${fiche.points_interet.length} points d’intérêt · ${fiche.acces.length} accès · ${fiche.sorties.length} sorties</p>` : '';
  return `<aside class="fiche-zone" aria-label="Fiche de ${esc(zone.nom)}">
    <header class="fiche-tete" style="--c:${st.couleur}">
      <div><p class="eyebrow">${esc(zone.id)} · ${esc(zone.type)} · ${esc(PRIORITES[zone.priorite])} (${esc(zone.priorite)})</p><h3>${esc(st.icone)} ${esc(zone.nom)}</h3><p>${esc(zone.description)}</p></div>
      <button class="fermer" data-action="fermer" aria-label="Fermer la fiche">×</button>
    </header>
    <div class="fiche-statut"><span class="badge-statut" style="--c:${st.couleur}">${esc(st.icone)} ${esc(st.label)}</span>${b.livrable ? '<span class="badge-ok">Livrable</span>' : `<span class="badge-ko">Non livrable${b.critiques.length ? ` · ${b.critiques.length} élément(s) critique(s) non validé(s)` : ''}</span>`}<span class="confiance">Données : ${esc(zone.confiance)} · correspondance ${esc(zone.jeu.correspondance)}</span></div>
    <div class="scores">${[['Conception', b.scores.conception], ['Production', b.scores.production], ['Jouable', b.scores.jouable]].map(([l, v]) => `<div><span>${l}</span><b>${pct(v)}</b><span class="bar"><i style="width:${(v || 0) * 100}%;background:${st.couleur}"></i></span></div>`).join('')}</div>
    <dl class="fiche-resume"><dt>Obligatoires</dt><dd>${b.compte.obligatoires_faits} faits / ${b.compte.obligatoires} · ${b.manquants.length} manquants</dd><dt>Optionnels</dt><dd>${b.compte.optionnels_faits} / ${b.compte.optionnels} (hors score)</dd><dt>Zones du jeu</dt><dd>${formes(zone).map((f) => `<code>${esc(f.zoneJeu)}</code> ${esc(f.nom)}`).join(', ') || 'absente du monde'}</dd><dt>Prochain jalon</dt><dd>${b.prochain ? `${esc(b.prochain.item)} ${esc(b.prochain.titre)} → ${esc(roleLabel(b.prochain.agent))}${b.prochain.tache ? ` (${esc(b.prochain.tache)})` : ' · aucune tâche'}` : '—'}</dd><dt>En aval</dt><dd>${b.dependants.length} zone(s) dépendent de celle-ci</dd><dt>Livraison</dt><dd>${b.decision ? esc(b.decision) : 'décision humaine en attente (H01)'}</dd><dt>Activité</dt><dd>${date(b.derniere_activite)}</dd></dl>
    ${b.bloques.length ? `<div class="alerte-bloque">⛔ ${b.bloques.map((x) => `${esc(x.id)} : ${esc(x.raison)}`).join('<br>')}</div>` : ''}
    ${fi}
    <div class="fiche-actions">${bouton('lancer-chantier', `data-zone="${zone.id}"`, b.taches.length ? 'Lancer un nouveau chantier' : 'Lancer le chantier', 'primary')}${actif() ? '' : '<span class="note">Actions disponibles avec le serveur de dev (<code>npm run dev</code>).</span>'}</div>
    <nav class="onglets" role="tablist">${Object.entries(onglets).map(([k, l]) => `<button role="tab" aria-selected="${ui.onglet === k}" data-action="onglet" data-valeur="${k}">${esc(l)}</button>`).join('')}</nav>
    <div class="fiche-corps">${corps}</div>
  </aside>`;
}

function formulaireTache(zone, b) {
  if (!actif()) return '';
  const manquants = b.manquants.filter((m) => !m.tache);
  return `<details class="form-tache"><summary>Créer une tâche ciblée</summary>
    <form data-form="tache" data-zone="${zone.id}">
      <label>Titre<input name="title" required maxlength="140"></label>
      <label>Description<textarea name="description" required rows="2"></textarea></label>
      <label>Agent responsable<select name="assigned_agent">${ctx.roles.map((r) => `<option value="${r.id}">${esc(r.role)} (${esc(r.agent)})</option>`).join('')}</select></label>
      <label>Priorité<select name="priority">${Object.entries(PRIORITES).map(([k, v]) => `<option value="${k}" ${k === zone.priorite ? 'selected' : ''}>${k} · ${esc(v)}</option>`).join('')}</select></label>
      <fieldset><legend>Éléments du checklist (sans tâche)</legend>${manquants.map((m) => `<label class="case"><input type="checkbox" name="items" value="${m.item}"> ${esc(m.cle)} ${esc(m.titre)}</label>`).join('') || '<small>Tous les manques ont déjà une tâche.</small>'}</fieldset>
      <label>Livrable attendu (chemin dans le périmètre de l’agent)<input name="path" required placeholder="production/fiches/${zone.id}.json"></label>
      <label>Nature<select name="nature"><option>specification</option><option>fichier</option><option>test</option><option>rapport</option></select></label>
      <fieldset><legend>Contrôles automatiques</legend>${CONTROLES.map((c) => `<label class="case"><input type="checkbox" name="controles" value="${c}" ${['fichiers', 'perimetre'].includes(c) ? 'checked' : ''}> ${c}</label>`).join('')}</fieldset>
      <label>Tests (chemins, un par ligne, si « tests »)<textarea name="tests" rows="2"></textarea></label>
      <label>Critères d’acceptation (un par ligne)<textarea name="criteres" required rows="3"></textarea></label>
      <button class="btn primary" ${ui.occupe ? 'disabled' : ''}>Créer la tâche</button>
    </form></details>`;
}

const LIBELLES = {
  'objective.created': (d) => `objectif ${d.objective.objective_id} créé : ${d.objective.title}`,
  'task.created': (d) => `tâche ${d.task.task_id} créée pour ${roleLabel(d.task.assigned_agent)}`,
  'task.ready': (d) => `${d.task_id} prête`, 'task.started': (d) => `${d.task_id} démarrée`,
  'task.blocked': (d) => `${d.task_id} bloquée : ${d.raison}`, 'task.unblocked': (d) => `${d.task_id} débloquée`,
  'deliverable.created': (d) => `livrable ${d.deliverable.path} (v${d.deliverable.version})`,
  'task.report_submitted': (d) => `rapport de ${d.task_id} : ${d.report.etat_final}`,
  'validation.started': (d) => `contrôles ${d.validation_id} lancés`, 'validation.passed': (d) => `contrôles ${d.validation_id} réussis`,
  'validation.failed': (d) => `contrôles ${d.validation_id} échoués`, 'validation.human_review': (d) => `${d.validation_id} : validation humaine nécessaire`,
  'review.accepted': (d) => `revue de ${d.task_id} : acceptée`, 'review.rejected': (d) => `revue de ${d.task_id} : refusée`,
  'review.blocked': (d) => `revue de ${d.task_id} : bloquée`, 'review.human': (d) => `revue de ${d.task_id} : décision humaine`,
  'task.completed': (d) => `${d.task_id} terminée`, 'integration.started': (d) => `intégration ${d.integration_id}`,
  'integration.completed': (d) => `${d.integration_id} intégrée`, 'integration.failed': (d) => `${d.integration_id} : échec d’intégration`,
  'checklist.item.updated': (d) => `${d.item_id} : ${Object.entries(d.changements).map(([k, v]) => `${k} ${v}`).join(', ')}`,
  'delivery.decided': (d) => `livraison de ${d.zone_id} : ${d.decision}`,
};
const libelle = (e) => (LIBELLES[e.type] ? LIBELLES[e.type](e.donnees) : e.type);

// ── vues d'ensemble : progression, production, agents, validation, assets ───────────────────────
function vueProgression() {
  const m = modele.monde;
  const recents = modele.etat.evenements.filter((e) => e.acteur !== 'audit').slice(-12).reverse();
  return `<div class="progression-grille">
    <article class="panel"><p class="eyebrow">PROGRESSION PAR ZONE</p><ol class="zones-barres">${m.zones.map((b) => { const z = ctx.zoneParId.get(b.zone); return `<li><button class="lien" data-action="zone" data-zone="${z.id}">${esc(b.icone)} ${esc(z.nom)}</button><span class="bar double" title="production ${pct(b.scores.production)} · jouable ${pct(b.scores.jouable)}"><i style="width:${(b.scores.production || 0) * 100}%;background:${b.couleur}"></i><i class="jouable" style="width:${(b.scores.jouable || 0) * 100}%"></i></span><small>${pct(b.scores.production)} · ${pct(b.scores.jouable)}</small></li>`; }).join('')}</ol><div class="panel-foot">Barre colorée : production · trait vert : préparation jouable</div></article>
    <article class="panel"><p class="eyebrow">PAR CATÉGORIE (OBLIGATOIRES)</p>${m.parSection.map((s) => `<div class="status-row"><div><span>${esc(s.section)} · ${esc(s.label)}</span><b>${s.faits}/${s.total}</b></div><span class="bar"><i style="width:${s.total ? (s.faits / s.total) * 100 : 0}%;background:#438875"></i></span></div>`).join('')}
      <p class="eyebrow espace">PAR AGENT (OBLIGATOIRES DE SON RÔLE)</p>${m.parAgent.map((a) => `<div class="status-row"><div><span>${esc(a.label)}</span><b>${a.faits}/${a.total}</b></div><span class="bar"><i style="width:${a.total ? (a.faits / a.total) * 100 : 0}%;background:#315d8a"></i></span></div>`).join('')}</article>
    <article class="panel"><p class="eyebrow">DÉPENDANCES CRITIQUES</p>${m.critiquesDeps.length ? `<ul class="compacte">${m.critiquesDeps.map((d) => `<li><code>${esc(d.task_id)}</code> attend ${d.attend.map((x) => `<code>${esc(x)}</code>`).join(', ')}</li>`).join('')}</ul>` : '<p class="empty-panel">Aucune tâche en attente d’un prérequis.</p>'}
      <p class="eyebrow espace">HISTORIQUE RÉCENT</p>${recents.length ? `<ol class="historique">${recents.map((e) => `<li><time>${date(e.at)}</time> ${esc(libelle(e))} <small>${esc(e.acteur)}</small></li>`).join('')}</ol>` : '<p class="empty-panel">Aucun événement hors audit initial.</p>'}</article>
  </div>`;
}

function vueProduction() {
  const taches = [...modele.etat.taches.values()].filter((t) => !ui.agent || t.assigned_agent === ui.agent);
  if (!taches.length) return '<p class="empty-panel">Aucune tâche. Ouvrez une zone et lancez son chantier : l’orchestrateur crée les tâches des quatre agents.</p>';
  return `<div class="kanban">${Object.entries(PRODUCTION).map(([k, l]) => { const ts = taches.filter((t) => t.status === k); return `<section class="colonne col-${k}"><h4>${esc(l)} <b>${ts.length}</b></h4>${ts.map((t) => carteTache(t)).join('') || '<p class="vide">—</p>'}</section>`; }).join('')}</div>`;
}

function vueAgents() {
  return `<div class="agents-grille">${modele.monde.parAgent.map((a) => {
    const r = ctx.roleParId.get(a.role);
    return `<article class="panel agent-panel"><header><h4>${esc(a.label)}</h4><span class="agent-puce">${a.en_cours ? 'Occupé' : 'Disponible'}</span></header>
      <p>Agent du dépôt : <code>${esc(r.agent)}</code> · <code>${esc(r.fichier)}</code></p><p class="note">${esc(r.mission)}</p>
      <dl class="fiche-resume"><dt>Tâches</dt><dd>${a.taches} · en cours ${a.en_cours} · revue ${a.revue} · corrections ${a.corrections} · bloquées ${a.bloquees} · terminées ${a.terminees}</dd>
      <dt>Dernier rapport</dt><dd>${a.dernier_rapport ? `<code>${esc(a.dernier_rapport.task_id)}</code> ${esc(a.dernier_rapport.etat_final)} · ${date(a.dernier_rapport.at)}<br><small>${esc(a.dernier_rapport.resume)}</small>` : 'aucun'}</dd>
      <dt>Erreurs</dt><dd>${a.erreurs.length ? a.erreurs.map((e) => `<code>${esc(e.task_id)}</code> ${e.defauts.map(esc).join(' ; ')}`).join('<br>') : 'aucune'}</dd>
      <dt>Temps, coût</dt><dd>non mesurés (l’hôte ne les expose pas)</dd><dt>Périmètre</dt><dd>${r.chemins_autorises.map((p) => `<code>${esc(p)}</code>`).join(' ')}</dd></dl></article>`;
  }).join('')}
  <article class="panel agent-panel"><header><h4>Relecteurs indépendants</h4></header><ul>${agentsData.relecteurs.map((r) => `<li><code>${esc(r.id)}</code> revoit ${r.revoit.map((x) => esc(roleLabel(x))).join(', ')}</li>`).join('')}</ul><p class="note">Un agent ne peut pas accepter son propre livrable (refusé par src/production/etat.js).</p></article></div>`;
}

function vueValidation() {
  const ts = [...modele.etat.taches.values()].filter((t) => t.status === 'review' || t.validation_status === 'human_review' || t.validation_status === 'failed');
  return ts.length ? `<div class="taches-liste">${ts.map((t) => carteTache(t, true)).join('')}</div>` : '<p class="empty-panel">Aucun livrable en attente de contrôle ou de revue.</p>';
}

function vueAssets() {
  const q = ui.q.toLowerCase();
  const ms = registry.MODELS.filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  return `<p class="note">${ms.length} modèle(s) · recherche commune avec la carte. Le catalogue complet, avec prévisualisation, reste <a href="/catalogue.html">/catalogue.html</a>.</p>
  <div class="table-wrap assets-table"><table class="work-table"><thead><tr><th>Identifiant</th><th>Nom</th><th>Statut (registre)</th><th>Variantes</th><th>Intégration</th><th>Zones liées</th></tr></thead><tbody>${ms.slice(0, 80).map((m) => `<tr><td><span class="model-id">${esc(m.id)}</span></td><td>${esc(m.name)}</td><td>${esc(registry.STATUTS[m.status] || m.status)}</td><td>${m.variants.length}</td><td>${m.usedIn.length ? `employé (${m.usedIn.length} lieu${m.usedIn.length > 1 ? 'x' : ''})` : 'non employé'}</td><td>${zonesDeModele(m).map((z) => `<button class="lien" data-action="zone" data-zone="${z.id}">${esc(z.nom)}</button>`).join(', ') || '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

function listeManques() {
  const lignes = modele.monde.zones.filter((b) => zoneVisible(ctx.zoneParId.get(b.zone))).flatMap((b) => b.manquants.filter((m) => (!ui.categorie || m.section === ui.categorie) && (!ui.agent || m.agent === ui.agent)).map((m) => ({ ...m, zone: b.zone })));
  const groupes = Object.entries(SECTIONS).map(([s, d]) => [d.label, lignes.filter((l) => l.section === s)]).filter(([, l]) => l.length);
  return `<div class="manques-carte"><h4>Éléments manquants (${lignes.length})</h4>${groupes.map(([label, ls]) => `<details><summary>${esc(label)} · ${ls.length}</summary><ul>${ls.map((m) => `<li><button class="lien" data-action="item" data-zone="${m.zone}" data-item="${m.item}">${esc(ctx.zoneParId.get(m.zone).nom)} · ${esc(m.titre)}</button>${m.critique ? ' <span class="puce critique">critique</span>' : ''} ${m.tache ? `<code>${esc(m.tache)}</code>` : '<small>sans tâche</small>'}</li>`).join('')}</ul></details>`).join('')}</div>`;
}

// ── rendu et interactions ───────────────────────────────────────────────────────────────────────
let racine = null;
function rendre() {
  calculer();
  const k = modele.monde.compte;
  const sel = ui.zone && ctx.zoneParId.get(ui.zone);
  const alertes = [
    donnees.erreur && `<div class="alerte">${esc(donnees.erreur)}</div>`,
    donnees.integrite?.length && `<div class="alerte">Journal : intégrité rompue (${donnees.integrite.length} erreur(s)) — ${esc(donnees.integrite[0].erreur)}. Vérifier avec <code>npm run prod -- verifier</code>.</div>`,
    modele.erreurs.length && `<div class="alerte">${modele.erreurs.length} événement(s) refusé(s) au rejeu : ${esc(modele.erreurs[0].erreur)}</div>`,
    ui.message && `<div class="message ${ui.message.type}" role="status">${esc(ui.message.texte)}</div>`,
  ].filter(Boolean).join('');
  racine.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">OPEN WORLD · ${ctx.zones.length} ZONES</p><h2>Chantier de l’archipel</h2><p>Statuts calculés depuis <code>production/journal.jsonl</code> (${donnees.evenements.length} événements) · ${donnees.source === 'serveur' ? `serveur de dev, version <code>${esc(donnees.version)}</code>` : 'instantané compilé, lecture seule'}</p></div>
      <div class="bascule" role="group" aria-label="Fond de carte"><button class="${ui.vue === 'monde' ? 'actif' : ''}" aria-pressed="${ui.vue === 'monde'}" data-action="vue" data-valeur="monde">Monde du jeu</button><button class="${ui.vue === 'reference' ? 'actif' : ''}" aria-pressed="${ui.vue === 'reference'}" data-action="vue" data-valeur="reference">Illustration de conception</button></div></div>
    ${alertes}
    <section class="kpis chantier-kpis" aria-label="Indicateurs du monde">
      <article class="kpi-warning"><span class="kpi-label">Manques obligatoires</span><b>${k.manquants}</b><small>sur ${ctx.zones.length} zones</small></article>
      <article><span class="kpi-label">Tâches</span><b>${k.taches}</b><small>${k.bloquees} bloquée(s) · ${k.a_valider} à valider</small></article>
      <article><span class="kpi-label">Validations échouées</span><b>${k.validations_echouees}</b><small>preuves conservées</small></article>
      <article class="kpi-progress"><span class="kpi-label">Zones jouables / intégrées</span><b>${k.zones_jouables} <i>/</i> ${k.zones_integrees}</b><small>sur ${ctx.zones.length}</small></article>
    </section>
    <div class="filtres" role="search">
      <label>Recherche<input type="search" data-filtre="q" value="${esc(ui.q)}" placeholder="zone, ARB-001, palmier…"></label>
      <label>Priorité<select data-filtre="priorite"><option value="">Toutes</option>${Object.entries(PRIORITES).map(([p, l]) => `<option value="${p}" ${ui.priorite === p ? 'selected' : ''}>${p} · ${esc(l)}</option>`).join('')}</select></label>
      <label>Agent<select data-filtre="agent"><option value="">Tous</option>${ctx.roles.map((r) => `<option value="${r.id}" ${ui.agent === r.id ? 'selected' : ''}>${esc(r.role)}</option>`).join('')}</select></label>
      <label>Catégorie manquante<select data-filtre="categorie"><option value="">Toutes</option>${Object.entries(SECTIONS).map(([s, d]) => `<option value="${s}" ${ui.categorie === s ? 'selected' : ''}>${s} · ${esc(d.label)}</option>`).join('')}</select></label>
      <label class="case"><input type="checkbox" data-filtre="manques" ${ui.manques ? 'checked' : ''}> Manques seulement</label>
      ${ui.statut || ui.priorite || ui.agent || ui.categorie || ui.q || ui.manques ? '<button class="btn" data-action="reinitialiser">Réinitialiser</button>' : ''}
    </div>
    <div class="chantier-corps">
      <div class="carte-cadre">${svgCarte()}${legende()}
        <p class="note">${ui.vue === 'monde' ? `Silhouettes calculées par le générateur du jeu (islandgen.js, home/terrain.js), aires des zones d’archipel.js (GEN_VERSION 4).${zonesData.reference.zones_du_jeu_hors_checklist.length ? ` Zone du jeu sans zone du checklist : ${esc(zonesData.reference.zones_du_jeu_hors_checklist.join(', '))}.` : ''}` : 'Carte de référence dont le monde a été tracé (4 m par pixel, même repère que le jeu) ; aires des zones du jeu par-dessus.'}</p>
        ${ui.manques ? listeManques() : ''}
      </div>
      ${sel ? ficheZone(sel) : '<aside class="fiche-zone vide"><p>Sélectionnez une zone sur la carte pour ouvrir sa fiche : checklist, manques, tâches, assets, tests, dépendances et historique.</p></aside>'}
    </div>
    <section class="section-block" id="progression"><div class="section-heading"><div><p class="eyebrow">PROGRESSION</p><h2>Progression et priorités</h2></div></div>${vueProgression()}</section>
    <section class="section-block" id="production"><div class="section-heading"><div><p class="eyebrow">CENTRE DE PRODUCTION</p><h2>Tâches par statut de production</h2><p>Validation et intégration restent des statuts séparés, affichés sur chaque carte.</p></div></div>${vueProduction()}</section>
    <section class="section-block" id="validation"><div class="section-heading"><div><p class="eyebrow">CENTRE DE VALIDATION</p><h2>Livrables à contrôler ou à revoir</h2></div></div>${vueValidation()}</section>
    <section class="section-block" id="agents"><div class="section-heading"><div><p class="eyebrow">CENTRE DES AGENTS</p><h2>Quatre rôles, agents du dépôt</h2></div></div>${vueAgents()}</section>
    <section class="section-block" id="assets"><div class="section-heading"><div><p class="eyebrow">CATALOGUE D’ASSETS</p><h2>Assets et zones liées</h2></div></div>${vueAssets()}</section>
    <dialog class="dialogue" id="dialogue-chantier"></dialog>`;
}

async function action(nom, corps) {
  ui.occupe = true;
  ui.message = { type: 'info', texte: nom === 'valider' || nom === 'integrer' ? 'Contrôles en cours (tests Vitest)…' : 'Enregistrement…' };
  rendre();
  try {
    const r = await fetch('/__production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: nom, ...corps }) });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
    ui.message = { type: 'ok', texte: resume(nom, j.resultat) };
    return j.resultat;
  } catch (err) {
    ui.message = { type: 'erreur', texte: `Refusé : ${err.message}` };
    return null;
  } finally {
    ui.occupe = false;
    await charger();
    rendre();
  }
}
function resume(nom, r) {
  if (nom === 'lancer-chantier') return `${r.objectif.objective_id} : ${r.taches.length} tâche(s) créée(s)${r.suspendues.length ? `, ${r.suspendues.length} suspendue(s) en attente de clarification` : ''}.`;
  if (nom === 'valider') return `Validation ${r.validation_id} : ${VALIDATION[r.resultat] || r.resultat}.`;
  if (nom === 'integrer') return `${r.integration_id} : ${INTEGRATION[r.resultat] || r.resultat}.`;
  if (nom === 'creer-tache') return `Tâche ${r.task_id} créée.`;
  if (nom === 'brief') return 'Brief prêt.';
  return 'Enregistré dans le journal.';
}

function choisirZone(id) {
  ui.zone = id;
  ui.onglet = 'checklist';
  history.replaceState(null, '', `#zone=${id}`);
  rendre();
  racine.querySelector('.fiche-zone')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function brancher() {
  racine.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-action], .zone-carte');
    if (!el || el.disabled) return;
    const a = el.dataset.action || 'zone';
    const zone = el.dataset.zone;
    const task = el.dataset.task;
    if (a === 'zone') choisirZone(zone);
    else if (a === 'item') {
      choisirZone(zone);
      const ligne = racine.querySelector(`#item-${CSS.escape(el.dataset.item)}`);
      ligne?.closest('details')?.setAttribute('open', '');
      ligne?.classList.add('surligne');
      ligne?.scrollIntoView({ block: 'center' });
    } else if (a === 'fermer') { ui.zone = null; history.replaceState(null, '', '#chantier'); rendre(); }
    else if (a === 'onglet') { ui.onglet = el.dataset.valeur; rendre(); }
    else if (a === 'vue') { ui.vue = el.dataset.valeur; rendre(); }
    else if (a === 'statut') { ui.statut = ui.statut === el.dataset.valeur ? '' : el.dataset.valeur; rendre(); }
    else if (a === 'reinitialiser') { Object.assign(ui, { statut: '', priorite: '', agent: '', categorie: '', q: '', manques: false }); rendre(); }
    else if (a === 'lancer-chantier') await action('lancer-chantier', { zone_id: zone });
    else if (a === 'demarrer') await action('demarrer', { task_id: task });
    else if (a === 'valider') await action('valider', { task_id: task });
    else if (a === 'integrer') await action('integrer', { task_id: task });
    else if (a === 'debloquer') await action('debloquer', { task_id: task });
    else if (a === 'revue-accepter') await action('revue', { task_id: task, decision: 'accepte', commentaire: 'Accepté depuis le dashboard' });
    else if (a === 'revue-refuser') {
      const criteres = prompt('Critères échoués (séparés par « ; ») :');
      const correction = criteres && prompt('Correction attendue :');
      if (criteres && correction) await action('revue', { task_id: task, decision: 'refuse', criteres_echoues: criteres.split(';').map((s) => s.trim()).filter(Boolean), correction_attendue: correction });
    } else if (a === 'brief') {
      const r = await action('brief', { task_id: task });
      if (r) {
        const d = racine.querySelector('#dialogue-chantier');
        d.innerHTML = `<form method="dialog"><h3>Brief ${esc(task)}</h3><pre>${esc(r.texte)}</pre><menu><button class="btn" type="button" data-copier>Copier</button><button class="btn primary">Fermer</button></menu></form>`;
        d.querySelector('[data-copier]').addEventListener('click', () => navigator.clipboard?.writeText(r.texte));
        d.showModal();
      }
    }
  });
  racine.addEventListener('keydown', (ev) => {
    const g = ev.target.closest('.zone-carte');
    if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); choisirZone(g.dataset.zone); }
  });
  let minuterie = null;
  racine.addEventListener('input', (ev) => {
    const f = ev.target.dataset.filtre;
    if (!f) return;
    ui[f] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    if (f !== 'q') { rendre(); return; }
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      rendre();
      const i = racine.querySelector('[data-filtre="q"]');
      i?.focus();
      i?.setSelectionRange(i.value.length, i.value.length);
    }, 250);
  });
  racine.addEventListener('submit', async (ev) => {
    const f = ev.target.closest('[data-form="tache"]');
    if (!f) return;
    ev.preventDefault();
    const fd = new FormData(f);
    const lignes = (k) => String(fd.get(k) || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const controles = fd.getAll('controles');
    await action('creer-tache', { task: {
      zone_id: f.dataset.zone, title: fd.get('title'), description: fd.get('description'), assigned_agent: fd.get('assigned_agent'), priority: fd.get('priority'),
      checklist_items: fd.getAll('items'), expected_deliverables: [{ path: fd.get('path'), nature: fd.get('nature') }],
      acceptance_criteria: lignes('criteres'), validation_method: { controles, ...(controles.includes('tests') ? { tests: lignes('tests') } : {}) },
    } });
  });
}

// vue sans DOM, pour les tests : carte, fiche et manques calculés depuis une liste d'événements
export function vueCarte(evenements, etatUi = {}) {
  donnees.evenements = evenements;
  Object.assign(ui, { vue: 'monde', manques: false, statut: '', priorite: '', agent: '', categorie: '', q: '', zone: null, onglet: 'checklist' }, etatUi);
  calculer();
  return {
    svg: svgCarte(),
    legende: legende(),
    fiche: ui.zone ? ficheZone(ctx.zoneParId.get(ui.zone)) : '',
    manques: listeManques(),
    bilan: modele.bilan,
    erreurs: modele.erreurs,
  };
}

export async function monterChantier(el) {
  racine = el;
  await charger();
  const h = location.hash.match(/^#zone=(ZONE-[A-Z0-9-]+)/);
  if (h && ctx.zoneParId.has(h[1])) ui.zone = h[1];
  rendre();
  brancher();
  // le journal peut changer hors de la page (CLI, agents) : relecture régulière en dev
  let dernier = donnees.evenements.at(-1)?.hash;
  setInterval(async () => {
    const saisie = racine.contains(document.activeElement) && document.activeElement.matches('input, textarea, select');
    if (donnees.source !== 'serveur' || document.hidden || ui.occupe || saisie) return;
    await charger();
    const h2 = donnees.evenements.at(-1)?.hash;
    if (h2 !== dernier) { dernier = h2; rendre(); }
  }, 5000);
}
