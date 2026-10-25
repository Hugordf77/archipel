import '../catalogue/style.css';
import './style.css';
import * as registry from '../src/models/registry.js';
import notesSnapshot from '../catalogue/notes.json';
import management from './management.json';
import { monterChantier } from './chantier.js';

const agentFiles = import.meta.glob('../.claude/agents/*.md', { eager: true, query: '?raw', import: 'default' });
const root = document.querySelector('#dashboard');
const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (path) => path.split('/').at(-1).replace(/\.md$/, '');
const agents = Object.entries(agentFiles).filter(([, body]) => /^name:\s*.+$/m.test(body)).map(([path, body]) => {
  const name = slug(path);
  const description = body.match(/^description:\s*(.+)$/m)?.[1] || 'Responsabilités à documenter';
  const outputs = management.roles?.[name]?.outputs || (name === 'evis' ? 'Constructeurs, fiches et contrôles du modèle' : name === 'evis-critique' ? 'Verdict, défauts prioritaires et vues consultées' : 'À préciser dans la consigne de l’agent');
  const inputs = management.roles?.[name]?.inputs || (name === 'evis' ? 'Brief, référence et contraintes de production' : name === 'evis-critique' ? 'Modèle, fiche et mesures ciblées' : 'À préciser dans la consigne de l’agent');
  return { name, description, outputs, inputs, path: path.replace('../', '') };
});

let notes = notesSnapshot.notes || {};
try { notes = (await fetch('/__catalogue/notes').then((r) => r.ok ? r.json() : null))?.notes || notes; } catch { /* instantané inclus à la compilation */ }
const statusOf = (model) => notes[model.id]?.status || model.status;
const statusNames = registry.STATUTS;
const counts = Object.fromEntries(Object.keys(statusNames).map((key) => [key, registry.MODELS.filter((model) => statusOf(model) === key).length]));
const categories = registry.CATEGORIES.map((cat) => ({ ...cat, count: registry.MODELS.filter((model) => model.category === cat.id).length }));
const rework = registry.MODELS.filter((model) => statusOf(model) === 'a-retravailler')
  .map((model) => ({ ...model, work: notes[model.id] || {} }))
  .sort((a, b) => (b.work.updatedAt || '').localeCompare(a.work.updatedAt || '') || a.id.localeCompare(b.id));
const recentNotes = Object.entries(notes).filter(([, note]) => note.note)
  .sort((a, b) => (b[1].updatedAt || '').localeCompare(a[1].updatedAt || ''));
const lastUpdate = recentNotes[0]?.[1]?.updatedAt;
const formatDate = (iso) => iso ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';
const excerpt = (text = '') => text.split(/\n/)[0].replace(/^.{0,120}.*/, (line) => line.length > 120 ? `${line.slice(0, 117)}…` : line);
const coordinator = { name: 'Coordinateur de tâche', description: 'Agent principal de la session ; affecte le travail et consolide les retours. Ce rôle dépend de l’hôte et ne correspond pas à un fichier agent dédié.', inputs: 'Priorités, brief et contraintes', outputs: 'Affectation, arbitrage et décision de suite', path: 'Rôle de session · non défini dans .claude/agents/' };
const byName = (name) => name === 'coordinateur' ? coordinator : agents.find((item) => item.name === name);
const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

root.innerHTML = `
  <header class="dash-head">
    <a class="dash-brand" href="/dashboard.html" aria-label="Archipel, tableau de bord"><span class="brand-mark">A</span><span><b>ARCHIPEL</b><small>Production · tableau de bord</small></span></a>
    <nav aria-label="Navigation principale"><a href="#overview">Synthèse</a><a href="#chantier">Chantier</a><a href="#production">Production</a><a href="#validation">Validation</a><a href="#agents">Agents</a><a href="#rework">À retravailler</a><a href="#team">Équipe</a><a href="#pipeline">Pipeline</a></nav>
    <div class="head-links"><a class="btn" href="/catalogue.html">Catalogue</a><a class="btn primary" href="/">Ouvrir le jeu</a></div>
  </header>
  <main class="dash-main">
    <section class="page-title" id="overview"><div><p class="eyebrow">ESPACE PROJET / ARCHIPEL</p><h1>État de production</h1><p>Vue opérationnelle du catalogue, des reprises et de l’équipe.</p></div><div class="updated"><span class="state-dot"></span><span><b>Projet actif</b><small>Notes actualisées · ${formatDate(lastUpdate)}</small></span></div></section>
    <section class="kpis" aria-label="Indicateurs du projet">
      <article><span class="kpi-label">Modèles au registre</span><b>${registry.MODELS.length}</b><small>${categories.length} catégories</small></article>
      <article class="kpi-warning"><span class="kpi-label">À retravailler</span><b>${counts['a-retravailler']}</b><small>${registry.MODELS.length ? Math.round(counts['a-retravailler'] / registry.MODELS.length * 100) : 0} % du catalogue</small></article>
      <article class="kpi-progress"><span class="kpi-label">Validés</span><b>${counts.valide}</b><small>${registry.MODELS.length ? Math.round(counts.valide / registry.MODELS.length * 100) : 0} % du catalogue</small></article>
      <article><span class="kpi-label">Brouillons / retirés</span><b>${counts.brouillon} <i>/</i> ${counts.retire}</b><small>statuts du registre</small></article>
    </section>
    <section class="overview-grid">
      <article class="panel status-panel"><div class="panel-head"><div><p class="eyebrow">RÉPARTITION</p><h2>Statuts du catalogue</h2></div><a href="/catalogue.html">Voir le catalogue →</a></div><div class="status-bars">${Object.entries(statusNames).map(([key, label]) => { const pct = registry.MODELS.length ? counts[key] / registry.MODELS.length * 100 : 0; return `<div class="status-row"><div><span>${esc(label)}</span><b>${counts[key]}</b></div><span class="bar"><i class="${key}" style="width:${pct}%"></i></span></div>`; }).join('')}</div><div class="panel-foot">Source · registre des modèles et notes de travail</div></article>
      <article class="panel focus-panel"><p class="eyebrow">POINT D’ATTENTION</p><h2>${rework.length ? `${rework.length} modèles demandent une reprise` : 'Aucune reprise signalée'}</h2><p>${rework.length ? 'Les modèles ci-dessous ont le statut « À retravailler ». Les remarques proviennent des notes du catalogue.' : 'Le registre ne contient actuellement aucun modèle au statut « À retravailler ». '}</p><a class="btn primary" href="#rework">Consulter la liste →</a></article>
    </section>
    <section class="section-block chantier" id="chantier" aria-busy="true"><p class="empty-panel">Chargement du chantier…</p></section>
    <section class="section-block" id="rework"><div class="section-heading"><div><p class="eyebrow">PRIORITÉS DU CATALOGUE</p><h2>À retravailler</h2><p>${rework.length} modèles signalés · triés par mise à jour récente</p></div><a class="text-link" href="/catalogue.html">Ouvrir le catalogue →</a></div>
      ${rework.length ? `<div class="table-wrap"><table class="work-table"><thead><tr><th>Modèle</th><th>Catégorie</th><th>Dernière note</th><th>Mise à jour</th><th></th></tr></thead><tbody>${rework.map((model) => { const cat = registry.CATEGORIES.find((item) => item.id === model.category); return `<tr><td><span class="model-id">${esc(model.id)}</span><b>${esc(model.name)}</b></td><td>${esc(cat?.label || model.category)}</td><td class="work-note">${esc(excerpt(model.work.note || 'Aucune note de reprise.'))}</td><td class="date-cell">${formatDate(model.work.updatedAt)}</td><td><a class="row-link" href="/catalogue.html" aria-label="Ouvrir le catalogue pour ${esc(model.id)}">↗</a></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty-panel">Aucun élément à retravailler.</div>'}
    </section>
    <section class="section-block" id="team"><div class="section-heading"><div><p class="eyebrow">RÔLES ET FLUX DE REVUE</p><h2>Équipe d’agents</h2><p>Schéma dérivé des agents disponibles dans <code>.claude/agents/</code>.</p></div><span class="hierarchy-tag">Aucune hiérarchie déclarée</span></div>
      <div class="team-diagram">
        <div class="agent-graph" aria-label="Schéma des transmissions entre agents, décrit dans dashboard/management.json">
          ${management.relations.map((relation) => { const from = byName(relation.from); const to = byName(relation.to); return from && to ? `<div class="graph-relation"><div class="graph-point ${relation.kind === 'review' ? 'reviewer-point' : ''}"><span class="graph-dot" aria-hidden="true"></span><b>${esc(from.name)}</b><small>${esc(relation.fromRole || (relation.from === 'coordinateur' ? 'Coordination de session' : 'Agent du dépôt'))}</small></div><div class="graph-link" aria-label="${esc(relation.label)}"><span>${esc(relation.label)}</span><i aria-hidden="true"></i><b aria-hidden="true">›</b></div><div class="graph-point ${relation.kind === 'review' ? 'reviewer-point' : ''}"><span class="graph-dot" aria-hidden="true"></span><b>${esc(to.name)}</b><small>${esc(relation.toRole || (relation.to === 'coordinateur' ? 'Coordination de session' : 'Agent du dépôt'))}</small></div></div>` : ''; }).join('')}
        </div>
        <div class="agent-details">
          ${[...agents, coordinator].map((item, i) => `<article class="agent-detail"><div class="detail-heading"><span class="detail-index ${item.name.includes('critique') ? 'review-index' : ''}">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(item.name)}</h3><small>${item.name === 'coordinateur' ? 'Coordinateur de session' : item.name.includes('critique') ? 'Revue · lecture seule' : 'Rôle spécialisé'}</small></div></div><p>${esc(item.description)}</p><dl><dt>Entrées</dt><dd>${esc(item.inputs)}</dd><dt>Livrables</dt><dd>${esc(item.outputs)}</dd><dt>Consigne</dt><dd><code>${esc(item.path)}</code></dd></dl></article>`).join('')}
        </div>
      </div><p class="diagram-caption">Les lignes indiquent des transmissions de travail, pas une subordination. Les rôles d’agents proviennent des fichiers disponibles ; le coordinateur dépend de l’hôte de session.</p>
    </section>
    <section class="section-block" id="pipeline"><div class="section-heading"><div><p class="eyebrow">PROCESSUS DE CRÉATION</p><h2>Du brief à l’intégration</h2><p>Responsables ajustables dans <code>dashboard/management.json</code>.</p></div></div><ol class="pipeline">${management.pipeline.map((step, i) => `<li><span class="step-no">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(step.label)}</h3><p>${esc(step.detail)}</p><small>${esc(step.owner)}</small></div></li>`).join('')}</ol></section>
    <section class="section-block" id="catalogue"><div class="section-heading"><div><p class="eyebrow">INVENTAIRE</p><h2>Catalogue par catégorie</h2><p>Accès au catalogue existant, sans maintenir un second inventaire.</p></div><a class="btn primary" href="/catalogue.html">Ouvrir le catalogue</a></div><div class="category-list">${categories.map((cat) => `<a class="category-item" href="/catalogue.html"><span class="cat-prefix">${esc(cat.prefix)}</span><b>${esc(cat.label)}</b><span>${plural(cat.count, 'modèle')}</span><i>↗</i></a>`).join('')}</div></section>
    <section class="game-strip"><div><p class="eyebrow">PRODUIT</p><h2>Archipel · jeu d’exploration 3D</h2><p>Monde ouvert de 6 × 4 km, exploration à pied, en bateau et en vol, aménagement.</p></div><a class="btn" href="/">Lancer le jeu →</a></section>
    <footer class="dash-foot"><span>ARCHIPEL · TABLEAU DE BORD LOCAL</span><span>Jeu <a href="/">/</a> · Catalogue <a href="/catalogue.html">/catalogue.html</a></span></footer>
  </main>`;

const chantier = document.querySelector('#chantier');
monterChantier(chantier).then(() => chantier.removeAttribute('aria-busy')).catch((err) => { chantier.innerHTML = `<div class="alerte">Chantier indisponible : ${esc(err.message)}</div>`; });
