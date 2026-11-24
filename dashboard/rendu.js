// Section « Rendu » du tableau de bord (/dashboard.html#rendu) : chantiers de rendu rejoués depuis le
// journal (mêmes gestionnaires que la production, src/production/rendu.js), état de la machine, portes,
// courbes des métriques d'une mesure à l'autre ; séries du banc (scripts/rendu/banc/) avec leur planche
// et leurs métriques. Lecture seule.
import { gestionnairesRendu, ETATS, PORTES, SEUILS } from '../src/production/rendu.js';

const esc = (v = '') => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const json = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const CHEMIN = ['BRIEF', 'AUDIT', 'HYPOTHESES', 'IMPLEMENTATION', 'MESURE', 'CRITIQUE', 'VALIDATION', 'LIVRAISON'];
const COLONNES = [
  ['lum_p1', 'lum p1'], ['lum_p50', 'p50'], ['lum_p99', 'p99'], ['noir_pur', 'noir pur'], ['blanc_brule', 'brûlé'],
  ['sat_moy', 'sat moy'], ['sat_max', 'sat max'], ['contraste_local', 'contraste'], ['hautes_freq', 'détail'], ['ombre_soleil', 'ombre/soleil'],
];

// rejoue les seuls événements de rendu (un événement refusé est ignoré, comme dans etat.js)
function rejouerRendu(evenements) {
  const etat = { rendu: new Map() };
  const refuse = (m) => { throw new Error(m); };
  const H = gestionnairesRendu({ refuse, estHumain: (a) => a === 'humain' || a.startsWith('humain:') });
  for (const e of evenements) {
    if (!H[e.type]) continue;
    try { H[e.type](etat, null, e); } catch { /* refusé : ignoré */ }
  }
  return [...etat.rendu.values()];
}

// alerte d'une métrique hors des seuils des portes
function horsSeuil(k, v) {
  if (typeof v !== 'number') return false;
  if (k === 'noir_pur') return v > SEUILS.noirPur;
  if (k === 'sat_max') return v > SEUILS.satMax;
  if (k === 'ombre_soleil') return v < SEUILS.ombreSoleil[0] || v > SEUILS.ombreSoleil[1];
  return false;
}

function tableMetriques(m) {
  const cads = Object.keys(m || {});
  if (!cads.length) return '<p class="empty-panel">Métriques non calculées (python3 scripts/rendu/banc/metriques.py serie &lt;série&gt;).</p>';
  return `<div class="table-wrap"><table class="work-table"><thead><tr><th>Cadrage</th>${COLONNES.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${cads.map((c) => `<tr><td><b>${esc(c)}</b></td>${COLONNES.map(([k]) => {
    const v = m[c][k];
    return `<td${horsSeuil(k, v) ? ' style="color:#9a3b1d;font-weight:700"' : ''}>${typeof v === 'number' ? (k === 'noir_pur' || k === 'blanc_brule' ? `${(v * 100).toFixed(2)} %` : v.toFixed(3)) : '—'}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// courbe d'une métrique (moyenne des cadrages) au fil des mesures d'un chantier
function courbe(points, titre) {
  if (points.length < 2) return '';
  const w = 220;
  const h = 54;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const k = max - min || 1;
  const xy = points.map((v, i) => `${(i / (points.length - 1)) * (w - 10) + 5},${h - 8 - ((v - min) / k) * (h - 16)}`).join(' ');
  return `<figure class="panel" style="margin:0"><figcaption style="font-size:10px;color:#657482">${esc(titre)} : ${points.map((v) => v.toFixed(3)).join(' → ')}</figcaption><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${esc(titre)}"><polyline points="${xy}" fill="none" stroke="#6a5acd" stroke-width="2"/></svg></figure>`;
}

const moyenne = (m, k) => {
  const v = Object.values(m || {}).map((x) => x[k]).filter((x) => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

async function carteChantier(c) {
  const series = c.mesures.map((m) => m.apres);
  const mets = await Promise.all(series.map((s) => json(`/captures/banc/${encodeURIComponent(s)}/metriques.json`)));
  const derniere = series.at(-1);
  const courbes = ['contraste_local', 'hautes_freq', 'ombre_soleil', 'sat_max', c.critere?.metrique]
    .filter((k, i, a) => k && a.indexOf(k) === i)
    .map((k) => courbe(mets.map((m) => moyenne(m, k)).filter((v) => v !== null), k)).join('');
  const pos = CHEMIN.indexOf(c.etat);
  return `<article class="panel" style="margin-bottom:14px">
    <div class="panel-head"><div><p class="eyebrow">${esc(c.chantier_id)} · ${esc(c.etat)}${c.iterations ? ` · itération ${c.iterations}/3` : ''}</p><h2>${esc(c.titre)}</h2><p style="font-size:11px;color:#657482">${esc(c.brief)} — critère : ${esc(c.critere?.metrique)}</p></div></div>
    <ol style="display:flex;gap:4px;flex-wrap:wrap;list-style:none;padding:0;margin:10px 0">${CHEMIN.map((e, i) => `<li style="padding:3px 7px;border-radius:5px;font-size:10px;background:${e === c.etat ? '#6a5acd' : i < pos ? '#dfe6ee' : '#f4f6f8'};color:${e === c.etat ? '#fff' : '#53616e'}">${e}</li>`).join('')}${['ITERATION', 'ESCALADE', 'ABANDON'].includes(c.etat) ? `<li style="padding:3px 7px;border-radius:5px;font-size:10px;background:#d89a44;color:#fff">${c.etat}</li>` : ''}</ol>
    ${c.portes ? `<p style="font-size:11px">${PORTES.map((p) => `<span style="margin-right:10px">${c.portes[p]?.verdict === 'passe' ? '✓' : '✗'} ${p}${c.portes[p]?.details ? ` <small style="color:#657482">${esc(c.portes[p].details)}</small>` : ''}</span>`).join('')}</p>` : ''}
    ${courbes ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:8px 0">${courbes}</div>` : ''}
    ${derniere ? `<a href="/captures/banc/${encodeURIComponent(derniere)}/planche.png" target="_blank" rel="noopener"><img src="/captures/banc/${encodeURIComponent(derniere)}/planche.png" alt="Planche ${esc(derniere)}" style="max-width:100%;border-radius:6px" loading="lazy"></a>` : ''}
  </article>`;
}

export async function monterRendu(el) {
  const prod = await json('/__production');
  const chantiers = rejouerRendu(prod?.evenements || []);
  const series = (await json('/__banc')) || [];
  const ref = series.find((s) => s.metriques) || series[0];
  const metRef = ref ? await json(`/captures/banc/${encodeURIComponent(ref.serie)}/metriques.json`) : null;
  el.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">BANC DE RENDU · MACHINE À ÉTATS</p><h2>Rendu</h2><p>Chantiers de rendu rejoués depuis le journal ; séries du banc (scripts/rendu/banc/). Méthode : <code>docs/RENDU.md</code>.</p></div></div>
    ${chantiers.length ? (await Promise.all(chantiers.map(carteChantier))).join('') : '<p class="empty-panel">Aucun chantier de rendu ouvert (node scripts/rendu/banc/chantier.mjs ouvrir REN-001 …).</p>'}
    <h3 style="font:600 14px Fredoka,sans-serif;margin:18px 0 8px">Séries du banc</h3>
    ${series.length ? `<div class="table-wrap"><table class="work-table"><thead><tr><th>Série</th><th>Fin</th><th>Qualité</th><th>Taille</th><th>Cadrages</th><th>Rejets</th><th>Planche</th></tr></thead><tbody>${series.map((s) => `<tr><td><b>${esc(s.serie)}</b></td><td class="date-cell">${esc((s.fin || '').replace('T', ' ').slice(0, 16))}</td><td>${esc(s.qualite)}</td><td>${esc((s.taille || []).join(' × '))}</td><td>${s.cadrages.length}</td><td>${s.rejets?.length ? `<span style="color:#9a3b1d">${esc(s.rejets.map((r) => r.nom).join(', '))}</span>` : '0'}</td><td>${s.planche ? `<a class="row-link" href="/captures/banc/${encodeURIComponent(s.serie)}/planche.png" target="_blank" rel="noopener">voir</a>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-panel">Aucune série (const B = await import(\'/scripts/rendu/banc/banc.js\'); await B.serie(__ile, \'nom\')).</p>'}
    ${ref ? `<h3 style="font:600 14px Fredoka,sans-serif;margin:18px 0 8px">Métriques · ${esc(ref.serie)}</h3>${tableMetriques(metRef)}<p style="font-size:10px;color:#657482">En rouge : hors des seuils des portes (noir pur > ${SEUILS.noirPur * 100} %, saturation max > ${SEUILS.satMax}, ombre/soleil hors ${SEUILS.ombreSoleil.join(' – ')}).</p>${ref.planche ? `<img src="/captures/banc/${encodeURIComponent(ref.serie)}/planche.png" alt="Planche ${esc(ref.serie)}" style="max-width:100%;border-radius:6px;margin-top:8px" loading="lazy">` : ''}` : ''}
    <p style="font-size:10px;color:#9ba5ad">États : ${ETATS.join(' · ')}</p>`;
}
