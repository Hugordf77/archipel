// Dynamique des pics de cheveux (pur, sans THREE ni DOM). Chaque groupe de pics monté sur ressort
// (dessus sur l'os HAIR_A, nuque sur HAIR_B, côtés sur HAIR_C) est un pendule raide fixé à la tête :
// la tête qui accélère (départ, arrêt brusque, appel et réception d'un saut, roulade) le pousse par inertie, le
// vent ressenti (vent du monde + vent de course) le couche, puis un ressort amorti le ramène à sa
// coiffure. Les données du groupe viennent de la coupe (HAIR_STYLES[…].dyn, models/personnage/coupes/) :
//   dir   direction moyenne des pics depuis le pivot (repère de la tête, unitaire)
//   lever bras de levier (m)
//   x     butées [arrière, avant] de la bascule autour de l'axe x (rad)
//   z     butée du roulis autour de l'axe z (rad)
// Le pas est fixe (sous-pas de 1/240 s) : même mouvement quelle que soit la cadence d'image.
// La même physique anime les deux pans de l'écharpe et le sac à dos (os SCARF, SCARF_B et BAG, fixés au
// torse : réglages PAN et SAC ci-dessous ; leurs données dir, lever, x, z viennent de
// models/personnage/corps/, DYN_PANS et DYN_SAC). z peut y être une paire de butées [intérieur, extérieur].

export const RESSORT = {
  k: 170, // raideur (rad/s² par rad) : ≈ 2 oscillations par seconde
  zeta: 0.32, // amortissement relatif : un rebond visible, éteint en moins d'une seconde
  gain: 0.45, // part de l'inertie d'un pendule libre (des cheveux raides suivent en partie la tête)
  vent: 2, // poussée du vent ressenti (m/s² par m/s) : couchés de 0,15 rad à 5 m/s
  pose: 0.5, // part de l'accélération du crâne due à la pose (foulée, appel) : une pose de dessin animé
  // secoue la tête plus qu'une vraie course
  lissage: 0.04, // constante de temps du lissage de l'accélération (s)
  butee: 30, // raideur des butées, en multiple de k
  vrille: 0.035, // vrille (axe y) par rad/s de rotation de la tête
  vrilleMax: 0.15, // vrille au plus (rad)
  pas: 1 / 240,
  maxPas: 16,
};

// Pans de l'écharpe : tissu léger, plus souple que les pics (≈ 1,2 oscillation par seconde), qui suit
// presque librement le torse et prend bien le vent (couchés en arrière à la course, soulevés au saut)
export const PAN = { ...RESSORT, k: 55, zeta: 0.3, gain: 0.9, vrille: 0.02, vrilleMax: 0.06, vent: 4 };
// Sac à dos : lourd et raide, petit débattement ; peu sensible au vent ; rebond vertical (rebond : ressort
// de la translation, m par m/s² de poussée, borné à ±max m)
export const SAC = { ...RESSORT, k: 260, zeta: 0.28, gain: 0.5, vent: 0.3, vrille: 0, vrilleMax: 0, rebond: { k: 320, zeta: 0.3, gain: 0.0035, max: 0.014 } };

export const hairSpring = () => ({ x: 0, vx: 0, y: 0, vy: 0, z: 0, vz: 0, ty: 0, vty: 0 });
// butées du roulis : symétriques (nombre) ou [intérieur, extérieur]
const bornesZ = (dyn) => (Array.isArray(dyn.z) ? dyn.z : [-dyn.z, dyn.z]);

// Accélération angulaire (rad/s²) d'un groupe sous une poussée f (repère de la tête, m/s²) :
// couple d'une masse au bout du bras (dir × f) / bras, à la part `gain` d'un pendule libre
export function hairTorque(dyn, f, out = { x: 0, z: 0 }, R = RESSORT) {
  const [dx, dy, dz] = dyn.dir;
  out.x = ((dy * f[2] - dz * f[1]) / dyn.lever) * R.gain;
  out.z = ((dx * f[1] - dy * f[0]) / dyn.lever) * R.gain;
  return out;
}

const _tq = { x: 0, z: 0 };
// angle d'équilibre v ramené en douceur sous la butée (lo < 0 < hi) : linéaire près du repos, jamais
// au-delà de la butée sous une poussée violente
const sature = (v, lo, hi) => (v >= 0 ? hi * Math.tanh(v / hi) : lo * Math.tanh(v / lo));

// Fait avancer le ressort d'un groupe de dt secondes. f : poussée dans le repère de la tête (m/s²) ;
// yawRate : vitesse de rotation de la tête autour de la verticale (rad/s), qui vrille un peu les pics ;
// R : réglages (RESSORT pour les pics, PAN, SAC)
export function stepHair(s, dyn, f, dt, yawRate = 0, R = RESSORT) {
  if (!(dt > 0)) return s;
  const { k, zeta, butee, pas, maxPas } = R;
  const c = 2 * zeta * Math.sqrt(k);
  hairTorque(dyn, f, _tq, R);
  const [zlo, zhi] = bornesZ(dyn);
  // cibles : l'angle où le ressort équilibre la poussée, saturé sous les butées
  const tx = sature(_tq.x / k, dyn.x[0], dyn.x[1]);
  const tz = sature(_tq.z / k, zlo, zhi);
  const ty = Math.max(-R.vrilleMax, Math.min(R.vrilleMax, -yawRate * R.vrille));
  const n = Math.min(maxPas, Math.ceil(dt / pas - 1e-9));
  const h = dt / n;
  const [lo, hi] = dyn.x;
  for (let i = 0; i < n; i++) {
    // butées souples : un ressort très raide et amorti au-delà de la butée (pas d'à-coup)
    const ox = s.x > hi ? s.x - hi : s.x < lo ? s.x - lo : 0;
    const oz = s.z > zhi ? s.z - zhi : s.z < zlo ? s.z - zlo : 0;
    const ax = k * (tx - s.x) - c * s.vx - (ox ? k * butee * ox + c * 4 * s.vx : 0);
    const az = k * (tz - s.z) - c * s.vz - (oz ? k * butee * oz + c * 4 * s.vz : 0);
    s.vx += ax * h;
    s.x += s.vx * h;
    s.vz += az * h;
    s.z += s.vz * h;
    s.vy += (k * (ty - s.y) - c * s.vy) * h;
    s.y += s.vy * h;
  }
  return s;
}

// Angles appliqués à l'os : bornés aux butées (le ressort peut les dépasser de quelques millièmes)
export function hairAngles(s, dyn, R = RESSORT) {
  const [lo, hi] = dyn.x;
  const [zlo, zhi] = bornesZ(dyn);
  return {
    x: Math.max(lo, Math.min(hi, s.x)),
    y: Math.max(-R.vrilleMax, Math.min(R.vrilleMax, s.y)),
    z: Math.max(zlo, Math.min(zhi, s.z)),
  };
}

// Rebond vertical du sac (translation de l'os, m) sous la poussée verticale fy (m/s², repère du torse) :
// ressort amorti vers fy · gain, saturé sous ±max ; rend la translation bornée
export function stepRebond(s, fy, dt, R = SAC) {
  const { k, zeta, gain, max } = R.rebond;
  if (dt > 0) {
    const c = 2 * zeta * Math.sqrt(k);
    const t = max * Math.tanh((fy * gain) / max);
    const n = Math.min(R.maxPas, Math.ceil(dt / R.pas - 1e-9));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      s.vty += (k * (t - s.ty) - c * s.vty) * h;
      s.ty += s.vty * h;
    }
  }
  return Math.max(-max, Math.min(max, s.ty));
}
