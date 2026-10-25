// Capture d'un modèle en jeu (npm run dev), sauvegarde verrouillée : le joueur rejoint une île où il vit, la
// caméra le cadre de près puis de loin, les images vont dans captures/ ; renvoie le coût en triangles de
// chaque espèce présente (versions fine et allégée, instances visibles).
// Dans la page du jeu :
//   const { jeu } = await import('/scripts/modeles/jeu.js');
//   await jeu({ espece: 'mouton', nom: 'mouton-v4' });     // un animal de la faune des îles
//   await jeu({ x: 716, z: -980, nom: 'plateau-vente' });  // ou un endroit (x, z absolus)
// Piège : remettre __ile.game.skipSave = true après chaque rechargement à chaud (fait ici à chaque appel).

const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

// coût de la faune des îles : par espèce, instances fines et allégées, triangles dessinés
export function coutFaune() {
  const F = window.__ile.game.islands.fauna;
  const out = {};
  for (const [sp, k] of F.kinds) {
    const fin = (k.meshes || []).reduce((a, im) => a + tris(im.geometry) * im.count, 0);
    const lege = (k.low?.meshes || []).reduce((a, im) => a + tris(im.geometry) * im.count, 0);
    const n = k.meshes?.[0]?.count ?? 0;
    if (n || k.low?.meshes?.[0]?.count) out[sp] = { fines: n, allegees: k.low?.meshes?.[0]?.count ?? 0, triangles: Math.round(fin + lege) };
  }
  return out;
}

export async function jeu({ espece = null, x = null, z = null, nom = espece || 'jeu', heure = 11, pres = 6, loin = 30 } = {}) {
  const I = window.__ile;
  if (!I) throw new Error('ouvrir le jeu (npm run dev) en mode dev');
  I.game.skipSave = true;
  I.setHour(heure);
  let cible = null;
  if (espece) {
    const { ISLANDS } = await import('/src/world/islands/regions.js');
    const { buildPlan } = await import('/src/world/islands/gen/plan.js');
    for (const d of ISLANDS) {
      const s = buildPlan(d).spawners.find((q) => q.sp === espece);
      if (s) { cible = { x: d.x + s.x, z: d.z + s.z, ile: d.name }; break; }
    }
    if (!cible) throw new Error(`aucune île n'accueille l'espèce ${espece}`);
  } else cible = { x, z, ile: null };
  I.tp(cible.x + 3, cible.z + 3);
  await I.settle(6000);
  let vise = { x: cible.x, z: cible.z };
  if (espece) {
    const an = I.game.islands.fauna.animals.filter((a) => a.sp === espece)
      .sort((a, b) => Math.hypot(a.x - cible.x, a.z - cible.z) - Math.hypot(b.x - cible.x, b.z - cible.z))[0];
    if (an) vise = { x: an.x, z: an.z };
  }
  // le joueur se poste à 8 m sur le côté du cadrage : hors du plan rapproché, à l'échelle dans le plan large
  const yaw = 0.7;
  I.tp(vise.x + Math.cos(yaw) * 8, vise.z - Math.sin(yaw) * 8);
  await I.settle(1500);
  if (espece) {
    const an = I.game.islands.fauna.animals.filter((a) => a.sp === espece)
      .sort((a, b) => Math.hypot(a.x - vise.x, a.z - vise.z) - Math.hypot(b.x - vise.x, b.z - vise.z))[0];
    if (an) vise = { x: an.x, z: an.z };
  }
  const fichiers = [];
  for (const [label, dist, pitch] of [['pres', pres, 0.3], ['loin', loin, 0.45]]) {
    I.frame({ dist, pitch, yaw, tx: vise.x, tz: vise.z });
    await I.settle(400);
    I.frame({ dist, pitch, yaw, tx: vise.x, tz: vise.z });
    await I.capture(`${nom}-jeu-${label}`);
    fichiers.push(`captures/${nom}-jeu-${label}.png`);
  }
  I.follow();
  return { ile: cible.ile, vise, fichiers, cout: coutFaune(), rendu: await I.perf() };
}
