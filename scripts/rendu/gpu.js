// Mesure du coût GPU de chaque passe du pipeline (outil de développement, chargé à la main dans la
// console : `const G = await import('/scripts/rendu/gpu.js'); G.installe(__ile)`).
// Requêtes EXT_disjoint_timer_query_webgl2 (non imbriquées : une passe à la fois).

export function installe(ile) {
  const game = ile.game;
  const P = game.pipeline;
  const R = game.renderer;
  const gl = R.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return null;
  if (window.__gpu) return window.__gpu;
  const acc = {};
  const pending = [];
  let cur = null;
  let disjoint = 0;
  const begin = (name) => {
    if (cur) return false;
    const q = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    cur = { name, q };
    return true;
  };
  const end = () => {
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    pending.push(cur);
    cur = null;
  };
  const wrap = (obj, key, name) => {
    const f = obj[key].bind(obj);
    obj[key] = (...a) => {
      const b = begin(name);
      const r = f(...a);
      if (b) end();
      return r;
    };
  };
  wrap(P.shadow, 'render', 'ombre');
  const passes = { tensorPass: 'tenseur', blurPass: 'flou', kuwaPass: 'kuwahara', kuwaSimplePass: 'kuwahara', compPass: 'composition' };
  for (const k of Object.keys(P)) {
    // passes ajoutées plus tard (FSPass nommées *Pass) : nommées d'après leur clé
    if (k.endsWith('Pass') && P[k]?.render) wrap(P[k], 'render', passes[k] || k.replace(/Pass$/, ''));
  }
  const rr = R.render.bind(R);
  R.render = (s, c) => {
    const t = R.getRenderTarget();
    let name = null;
    if (t === P.sceneRT) name = 'gbuffer';
    else if (t === null && s === game.overlayScene) name = 'calque';
    const b = name ? begin(name) : false;
    rr(s, c);
    if (b) end();
  };
  const api = {
    acc,
    poll() {
      if (gl.getParameter(ext.GPU_DISJOINT_EXT)) disjoint++;
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (!gl.getQueryParameter(p.q, gl.QUERY_RESULT_AVAILABLE)) continue;
        (acc[p.name] ||= []).push(gl.getQueryParameter(p.q, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(p.q);
        pending.splice(i, 1);
      }
    },
    // médiane par passe sur ms millisecondes de jeu (l'ombre ne tourne qu'une image sur shadowEvery)
    async mesure(ms = 3000) {
      for (const k of Object.keys(acc)) delete acc[k];
      disjoint = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        await new Promise((r) => setTimeout(r, 16));
        this.poll();
      }
      const out = {};
      let total = 0;
      const every = P.q.shadowEvery || 1;
      for (const k of Object.keys(acc)) {
        const a = acc[k].slice().sort((x, y) => x - y);
        const med = a[Math.floor(a.length / 2)];
        out[k] = +med.toFixed(2);
        total += k === 'ombre' ? med / every : med;
      }
      out.parImage = +total.toFixed(2);
      out.disjoint = disjoint;
      return out;
    },
  };
  window.__gpu = api;
  return api;
}

// Banc synchrone, plus fiable que les requêtes sous ANGLE/Metal (qui comptent l'attente) : chaque passe
// rejouée n fois entre deux synchronisations (lecture d'un pixel), coût moyen en ms. La scène et la
// caméra sont celles de l'image courante ; les cibles sont celles du pipeline.
export function banc(ile, n = 20) {
  const game = ile.game;
  const P = game.pipeline;
  const R = game.renderer;
  const gl = R.getContext();
  const px = new Uint8Array(4);
  const THREE_UNSIGNED_BYTE = 1009;
  // lecture d'un pixel de la cible écrite : attend la fin de son travail
  const sync = (rt) => {
    R.setRenderTarget(rt);
    if (rt && rt.depthTexture && rt === P.shadow.rt) return gl.finish();
    if (rt && rt.texture.type !== THREE_UNSIGNED_BYTE) {
      const f = new Float32Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, f);
    } else gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    R.setRenderTarget(null);
  };
  const scene = game.world.scene;
  const cam = game.camera;
  const temps = (f, rt = null) => {
    f();
    sync(rt);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) f();
    sync(rt);
    return +((performance.now() - t0) / n).toFixed(2);
  };
  // une image complète d'abord : les uniformes des passes sont à jour
  P.render(scene, cam, game.overlayScene);
  const out = {};
  out.ombre = temps(() => P.shadow.render(R, scene, P.shadowCenter), P.shadow.rt);
  out.gbuffer = temps(() => {
    R.setRenderTarget(P.sceneRT);
    R.render(scene, cam);
  }, P.sceneRT);
  if (P.q.aniso) {
    out.tenseur = temps(() => P.tensorPass.render(R, P.tensorRT), P.tensorRT);
    const bu = P.blurPass.u;
    out.flou2 = temps(() => {
      bu.tSrc.value = P.tensorRT.texture;
      bu.uDir.value.set(1 / P.PW, 0);
      P.blurPass.render(R, P.blurRT);
      bu.tSrc.value = P.blurRT.texture;
      bu.uDir.value.set(0, 1 / P.PH);
      P.blurPass.render(R, P.blurRT2);
    }, P.blurRT2);
    out.kuwahara = temps(() => P.kuwaPass.render(R, P.paintRT), P.paintRT);
  } else {
    out.kuwahara = temps(() => P.kuwaSimplePass.render(R, P.paintRT), P.paintRT);
  }
  out.composition = temps(() => P.compPass.render(R, null));
  // calque superposé (particules, pluie) dessiné après la composition
  if (game.overlayScene) out.calque = temps(() => { R.setRenderTarget(null); R.render(game.overlayScene, cam); });
  out.image = temps(() => P.render(scene, cam, game.overlayScene));
  out.ombreParImage = +(out.ombre / (P.q.shadowEvery || 1)).toFixed(2);
  return out;
}
