// Planche d'un modèle, dans le catalogue (npm run catalogue) : 6 vues (face, dos, profil, dessus, 3/4 avant,
// 3/4 arrière), 2 poses de broutage et des gros plans (tête, pattes), composés dans le canvas et rangés dans
// captures/ (plugin /__capture du serveur de dev) ; « référence / modèle » côte à côte s'il y a une planche.
// Dans la page du catalogue :
//   const { planche } = await import('/scripts/modeles/planche.js');
//   await planche({ id: 'ANI-001', nom: 'mouton-v4' });   // → captures/mouton-v4-*.png
// Pièges : onglet en arrière-plan (canvas figé) → mettre l'onglet devant ; panneau replié (vue de 0 × 0) →
// agrandir la fenêtre ; la pose est remise au repos (t = 0) avant les vues fixes.

const VUES = [
  ['Face', [0, 0.12, 1]], ['Dos', [0, 0.12, -1]], ['Profil', [-1, 0.08, 0]],
  ['Dessus', [0, 1, 0.0001]], ['3/4 avant', [-0.62, 0.32, 0.72]], ['3/4 arrière', [0.62, 0.32, -0.72]],
];
const attendre = (n = 2) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const charge = (src) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

// une vue : caméra dans la direction dir depuis le centre, à la distance qui cadre le rayon r
async function vue(v, centre, r, dir, zoom = 1) {
  const cam = v.camera;
  const d = ((r * 1.06) / Math.sin((cam.fov * Math.PI) / 360)) / zoom; // la sphère englobante entière
  const n = Math.hypot(...dir);
  cam.up.set(0, 1, 0);
  if (dir[1] / n > 0.99) cam.up.set(0, 0, 1); // vue de dessus : tête en haut, comme les planches
  cam.position.set(centre.x + (dir[0] / n) * d, centre.y + (dir[1] / n) * d, centre.z + (dir[2] / n) * d);
  cam.near = Math.max(0.01, d / 300);
  cam.far = d * 50 + 50;
  cam.updateProjectionMatrix();
  v.controls.target.copy(centre);
  v.controls.update();
  cam.lookAt(centre);
  return charge(v.snapshot());
}

// grille d'images légendées (fond papier), en PNG
function compose(images, cols, titre, w = 420) {
  const h = Math.round(w * 1.05);
  const rows = Math.ceil(images.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * w;
  c.height = rows * h + 44;
  const g = c.getContext('2d');
  g.fillStyle = '#f3e6cf';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#5b4a63';
  g.font = '600 22px Nunito, sans-serif';
  g.fillText(titre, 14, 30);
  images.forEach(([label, img], i) => {
    const x = (i % cols) * w;
    const y = 44 + Math.floor(i / cols) * h;
    const k = Math.min((w - 12) / img.width, (h - 36) / img.height);
    g.drawImage(img, x + (w - img.width * k) / 2, y + 6, img.width * k, img.height * k);
    g.font = '600 16px Nunito, sans-serif';
    g.fillText(label, x + 12, y + h - 10);
  });
  return c;
}
async function range(canvas, nom) {
  await fetch(`/__capture?name=${encodeURIComponent(nom)}`, { method: 'POST', body: canvas.toDataURL('image/png') });
  return `captures/${nom}.png`;
}

export async function planche({ id, nom = id.toLowerCase(), params = null, brouter = true, gros = true, reference = 'auto' } = {}) {
  const C = window.__catalogue;
  if (!C) throw new Error('ouvrir le catalogue (npm run catalogue) en mode dev');
  const v = C.ouvrir(id, params);
  v.resize();
  await attendre(3);
  if (v.canvas.clientWidth < 200 || v.canvas.clientHeight < 200) throw new Error(`vue de ${v.canvas.clientWidth} × ${v.canvas.clientHeight} : agrandir la fenêtre (panneau replié ?) puis relancer`);
  // vues carrées de 900 px, quelle que soit la fenêtre
  v.pipeline.setSize(900, 900);
  v.camera.aspect = 1;
  v.camera.updateProjectionMatrix();
  const avant = { ...v.opts };
  for (const [k, val] of Object.entries({ rotate: false, anim: false, bbox: false, scale: false, grid: false })) v.set(k, val);
  const it = v.items[0];
  it.anim?.(0, 0); // pose au repos
  const box = v.box.clone();
  const centre = box.getCenter(box.min.clone());
  const taille = box.getSize(box.max.clone());
  const r = Math.max(taille.x, taille.y, taille.z) * 0.5 + 0.05;
  const m = C.R.BY_ID.get(id);
  const fichiers = [];
  const six = [];
  for (const [label, dir] of VUES) six.push([label, await vue(v, centre, r, dir)]);
  fichiers.push(await range(compose(six, 3, `${id} · ${m.name} · 6 vues`), `${nom}-6vues`));
  if (brouter && m.ref.startsWith('species:') && it.anim) {
    const poses = [];
    for (const [label, t] of [['Broutage, mi-course', 5], ['Broutage, museau dans l’herbe', 6]]) {
      it.anim(0, t);
      poses.push([label, await vue(v, centre, r, [-1, 0.1, 0])]);
    }
    it.anim(0, 0);
    fichiers.push(await range(compose(poses, 2, `${id} · ${m.name} · broutage`), `${nom}-broutage`));
  }
  if (gros) {
    const tete = centre.clone().set(centre.x, box.min.y + taille.y * 0.75, centre.z + taille.z * 0.32);
    const pattes = centre.clone().set(centre.x, box.min.y + taille.y * 0.15, centre.z);
    const plans = [
      ['Tête, profil', await vue(v, tete, r, [-1, 0.1, 0.15], 2.6)], ['Tête, 3/4', await vue(v, tete, r, [-0.6, 0.25, 0.75], 2.6)],
      ['Pattes, 3/4 avant', await vue(v, pattes, r, [-0.6, 0.15, 0.75], 2.2)], ['Pattes, 3/4 arrière', await vue(v, pattes, r, [0.6, 0.15, -0.75], 2.2)],
    ];
    fichiers.push(await range(compose(plans, 2, `${id} · ${m.name} · gros plans`), `${nom}-gros-plans`));
  }
  const ref = reference === 'auto' ? `/${m.source.replace(/index\.js$/, 'reference.png')}` : reference;
  const img = ref ? await charge(ref).catch(() => null) : null;
  if (img) {
    // les 6 vues en 2 colonnes, comme une planche de référence, à côté d'elle
    const modele = await charge(compose(six, 2, '', 360).toDataURL('image/png'));
    fichiers.push(await range(compose([['Référence', img], ['Modèle', modele]], 2, `${id} · ${m.name} · référence / modèle`, 640), `${nom}-reference-vs-modele`));
  }
  for (const [k, val] of Object.entries(avant)) v.set(k, val);
  v.resize();
  v.frame();
  return { id, fichiers };
}
