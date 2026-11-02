// Dynamique des pics de cheveux (pur, sans THREE ni DOM). Chaque groupe de pics monté sur ressort
// (couronne sur l'os HAIR_A, arrière sur HAIR_B) est un pendule raide fixé à la tête : la tête qui
// accélère (départ, arrêt brusque, appel et réception d'un saut, roulade) le pousse par inertie, le
// vent ressenti (vent du monde + vent de course) le couche, puis un ressort amorti le ramène à sa
// coiffure. Les données du groupe viennent de la coupe (HAIR_STYLES[…].dyn, models/personnage/coupes/) :
//   dir   direction moyenne des pics depuis le pivot (repère de la tête, unitaire)
//   lever bras de levier (m)
//   x     butées [arrière, avant] de la bascule autour de l'axe x (rad)
//   z     butée du roulis autour de l'axe z (rad)
// Le pas est fixe (sous-pas de 1/240 s) : même mouvement quelle que soit la cadence d'image.

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

export const hairSpring = () => ({ x: 0, vx: 0, y: 0, vy: 0, z: 0, vz: 0 });

// Accélération angulaire (rad/s²) d'un groupe sous une poussée f (repère de la tête, m/s²) :
// couple d'une masse au bout du bras (dir × f) / bras, à la part `gain` d'un pendule libre
export function hairTorque(dyn, f, out = { x: 0, z: 0 }) {
  const [dx, dy, dz] = dyn.dir;
  out.x = ((dy * f[2] - dz * f[1]) / dyn.lever) * RESSORT.gain;
  out.z = ((dx * f[1] - dy * f[0]) / dyn.lever) * RESSORT.gain;
  return out;
}

const _tq = { x: 0, z: 0 };
// angle d'équilibre v ramené en douceur sous la butée (lo < 0 < hi) : linéaire près du repos, jamais
// au-delà de la butée sous une poussée violente
const sature = (v, lo, hi) => (v >= 0 ? hi * Math.tanh(v / hi) : lo * Math.tanh(v / lo));

// Fait avancer le ressort d'un groupe de dt secondes. f : poussée dans le repère de la tête (m/s²) ;
// yawRate : vitesse de rotation de la tête autour de la verticale (rad/s), qui vrille un peu les pics
export function stepHair(s, dyn, f, dt, yawRate = 0) {
  if (!(dt > 0)) return s;
  const { k, zeta, butee, pas, maxPas } = RESSORT;
  const c = 2 * zeta * Math.sqrt(k);
  hairTorque(dyn, f, _tq);
  // cibles : l'angle où le ressort équilibre la poussée, saturé sous les butées
  const tx = sature(_tq.x / k, dyn.x[0], dyn.x[1]);
  const tz = sature(_tq.z / k, -dyn.z, dyn.z);
  const ty = Math.max(-RESSORT.vrilleMax, Math.min(RESSORT.vrilleMax, -yawRate * RESSORT.vrille));
  const n = Math.min(maxPas, Math.ceil(dt / pas - 1e-9));
  const h = dt / n;
  const [lo, hi] = dyn.x;
  for (let i = 0; i < n; i++) {
    // butées souples : un ressort très raide et amorti au-delà de la butée (pas d'à-coup)
    const ox = s.x > hi ? s.x - hi : s.x < lo ? s.x - lo : 0;
    const oz = Math.abs(s.z) > dyn.z ? s.z - Math.sign(s.z) * dyn.z : 0;
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
export function hairAngles(s, dyn) {
  const [lo, hi] = dyn.x;
  return {
    x: Math.max(lo, Math.min(hi, s.x)),
    y: Math.max(-RESSORT.vrilleMax, Math.min(RESSORT.vrilleMax, s.y)),
    z: Math.max(-dyn.z, Math.min(dyn.z, s.z)),
  };
}
