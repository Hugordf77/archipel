import * as THREE from 'three';
import { GABARIT } from '../../models/personnage/gabarit.js';
import { deformeTete } from '../../models/personnage/tete.js';

// Visage du joueur peint dans un canvas (aucune image externe).
// L'atlas 1024×1024 contient 4×4 cases de 256 px : les deux premières rangées
// pour les yeux (avec sourcils et joues), les deux dernières pour la bouche.
// Le shader du visage superpose une case « yeux » et une case « bouche » :
// toutes les combinaisons d'expressions tiennent en un seul appel de dessin.

// Géométrie de la tête (partagée avec Character.js)
export const FACE = {
  R: GABARIT.FACE.R, // rayon du crâne (gabarit : 0,28 chibi, 0,161 héros)
  SX: GABARIT.FACE.SX, // aplatissement
  SY: GABARIT.FACE.SY,
  PHI: 1.7, // largeur angulaire du masque facial
  TOP: 0.45, // au-dessus de l'équateur (rad)
  BOT: 0.7, // en dessous
};

// L'atlas se dessine en mètres d'un crâne de référence (le chibi, R = 0,28) : la calotte du visage est
// découpée aux mêmes angles quel que soit le gabarit, les traits suivent donc l'échelle de la tête.
const ATLAS_R = 0.28;
const SPAN_X = FACE.PHI * ATLAS_R * FACE.SX; // largeur du masque, en mètres du crâne de référence
const TOP_M = FACE.TOP * ATLAS_R * FACE.SY;
const SPAN_Y = (FACE.TOP + FACE.BOT) * ATLAS_R * FACE.SY;

// Atlas : 4 colonnes × 5 rangées de cases de 256 px. Une case contient soit les yeux (avec sourcils et
// joues), soit la bouche (avec le nez) ; le shader en superpose une de chaque.
const COLS = 4;
const ROWS = 5;
const CELL = 256;
export const EYE = { ouverts: 0, fermes: 1, joie: 2, micl: 3, grands: 4, concentre: 5, effort: 6, pensif: 7 };
export const MOUTH = { sourire: 8, grandSourire: 9, ouverte: 10, o: 11, plate: 12, baille: 13, petite: 14, souffle: 15, coin: 16, detendue: 17 };

// Expressions = paire (yeux, bouche). Celles des planches : joie (yeux en arcs, grande bouche ouverte et
// langue), surpris (yeux ronds, bouche en « o »), endormi (yeux fermés, bouche détendue), pensif (regard
// levé de côté), determine (sourcils froncés, sourire en coin).
export const EXPRESSIONS = {
  neutre: [EYE.ouverts, MOUTH.sourire],
  clignement: [EYE.fermes, MOUTH.sourire],
  joie: [EYE.joie, MOUTH.ouverte],
  joieOuverte: [EYE.joie, MOUTH.ouverte],
  concentre: [EYE.concentre, MOUTH.plate],
  determine: [EYE.concentre, MOUTH.coin],
  pensif: [EYE.pensif, MOUTH.petite],
  somnolent: [EYE.micl, MOUTH.detendue],
  endormi: [EYE.fermes, MOUTH.detendue],
  surpris: [EYE.grands, MOUTH.o],
  content: [EYE.ouverts, MOUTH.grandSourire],
  baillement: [EYE.fermes, MOUTH.baille],
  // sprint : yeux plissés, on serre les dents puis on souffle ; après : essoufflé
  effort: [EYE.effort, MOUTH.plate],
  effortSouffle: [EYE.effort, MOUTH.souffle],
  essouffle: [EYE.micl, MOUTH.souffle],
};

// Yeux qui se ferment le temps d'un clignement
export const BLINKABLE = new Set([EYE.ouverts, EYE.grands, EYE.concentre, EYE.micl, EYE.effort, EYE.pensif]);

// Décalage et échelle UV d'une case de l'atlas
export function cellUV(i, out = new THREE.Vector4()) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return out.set(col / COLS, 1 - (row + 1) / ROWS, 1 / COLS, 1 / ROWS);
}

// Calotte sphérique posée sur l'avant du crâne, déformée comme lui (visage ovale du gabarit, tete.js)
export function faceGeometry() {
  const g = new THREE.SphereGeometry(FACE.R * 1.012, 20, 11, Math.PI / 2 - FACE.PHI / 2, FACE.PHI, Math.PI / 2 - FACE.TOP, FACE.TOP + FACE.BOT);
  g.scale(FACE.SX, FACE.SY, 1);
  return deformeTete(g);
}

const INK = '#3d3049';
const MOUTH_INK = '#7b4f5e';
// Œil d'aventurier des planches : grand, placé au milieu du visage ; blanc crème (jamais blanc pur), iris
// brun chaud en dégradé (foncé en haut, clair en bas) qui remplit presque l'œil, pupille d'encre, deux
// reflets blancs (un grand en haut, un petit en bas), trait de cils épais en haut, pas de cils en bas.
// Mesures en mètres du crâne de référence (le chibi, R = 0,28) : elles suivent l'échelle de la tête.
const SCLERA = '#fdf8f0';
const IRIS = { rx: 0.4, ry: 0.4, dy: 0.02, haut: '#4f3027', milieu: '#7a4a33', bas: '#c08a5a' };
const EYE_X = 0.116;
const EYE_Y = -0.05;
const SHAPES = {
  ovale: { w: 0.112, h: 0.152, lid: 0 },
  rond: { w: 0.12, h: 0.136, lid: 0 },
  amande: { w: 0.12, h: 0.118, lid: 0.16 },
};
// hauteur de la bouche et du nez (sous les yeux, vers le bas du visage ovale) ; joues rosées
const MOUTH_Y = -0.138;
const NOSE_Y = -0.1;
const CHEEK = { x: 0.172, y: -0.12, rx: 0.058, ry: 0.036 };

export class FaceAtlas {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = COLS * CELL;
    this.canvas.height = ROWS * CELL;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.premultiplyAlpha = true;
    this.texture.anisotropy = 4;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.key = '';
  }

  // Repère « mètres sur le visage » (x à droite, y vers le haut) dans la case i
  cell(i) {
    const ctx = this.ctx;
    const x0 = (i % COLS) * CELL;
    const y0 = Math.floor(i / COLS) * CELL;
    ctx.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(x0 + 2, y0 + 2, CELL - 4, CELL - 4);
    ctx.clip();
    const sx = CELL / SPAN_X;
    const sy = CELL / SPAN_Y;
    ctx.setTransform(sx, 0, 0, -sy, x0 + CELL / 2, y0 + TOP_M * sy);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  draw({ eyes = 'ovale', brow = INK } = {}) {
    const key = `${eyes}|${brow}`;
    if (key === this.key) return;
    this.key = key;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const shape = SHAPES[eyes] || SHAPES.ovale;
    for (const [name, i] of Object.entries(EYE)) {
      this.cell(i);
      this.drawEyes(name, shape, brow);
    }
    for (const [name, i] of Object.entries(MOUTH)) {
      this.cell(i);
      this.drawMouth(name);
    }
    ctx.restore();
    this.texture.needsUpdate = true;
  }

  // joues rosées : ovales doux, sans hachures
  cheeks(alpha = 0.5) {
    const ctx = this.ctx;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * CHEEK.x, CHEEK.y);
      ctx.scale(1, CHEEK.ry / CHEEK.rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, CHEEK.rx);
      g.addColorStop(0, `rgba(244, 150, 146, ${alpha})`);
      g.addColorStop(0.55, `rgba(244, 150, 146, ${alpha * 0.6})`);
      g.addColorStop(1, 'rgba(244, 150, 146, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, CHEEK.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // sourcils épais et courts, en fuseau (plus épais vers l'intérieur) ; dy : hauteur, tilt > 0 : bout
  // intérieur plus bas (froncé), < 0 : relevé ; arch : bombé ; side : le sourcil droit plus haut de tant
  brows(color, { dy = 0, tilt = 0, arch = 0.008, side = 0 } = {}) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    for (const sx of [-1, 1]) {
      const cx = sx * (EYE_X + 0.004);
      const y = EYE_Y + 0.112 + dy + (sx > 0 ? side : 0);
      const xi = cx - sx * 0.036; // bout intérieur
      const xo = cx + sx * 0.036; // bout extérieur
      const yi = y - tilt;
      const yo = y + tilt * 0.35 - 0.004;
      ctx.beginPath();
      ctx.moveTo(xi, yi + 0.011);
      ctx.quadraticCurveTo(cx, y + arch + 0.011, xo, yo + 0.003);
      ctx.quadraticCurveTo(cx, y + arch - 0.008, xi, yi - 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(xi, yi + 0.0005, 0.0105, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Œil ouvert. sx : côté (−1 gauche, +1 droit) ; scale : taille ; cutTop : part cachée par la paupière ;
  // iris : taille de l'iris (< 1 : surprise) ; look : [x, y] du regard, en part de la place libre
  openEye(cx, sx, shape, { scale = 1, cutTop = 0, iris = 1, look = [0, 0] } = {}) {
    const ctx = this.ctx;
    const w = shape.w * scale;
    const h = shape.h * scale;
    const cut = Math.max(cutTop, shape.lid);
    const lidY = EYE_Y + h / 2 - h * cut;
    // contour : haut un peu aplati, bas bien rond
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, EYE_Y + h * 0.08);
      ctx.bezierCurveTo(cx - w / 2, EYE_Y + h * 0.42, cx - w * 0.3, EYE_Y + h / 2, cx, EYE_Y + h / 2);
      ctx.bezierCurveTo(cx + w * 0.3, EYE_Y + h / 2, cx + w / 2, EYE_Y + h * 0.42, cx + w / 2, EYE_Y + h * 0.08);
      ctx.bezierCurveTo(cx + w / 2, EYE_Y - h * 0.36, cx + w * 0.28, EYE_Y - h / 2, cx, EYE_Y - h / 2);
      ctx.bezierCurveTo(cx - w * 0.28, EYE_Y - h / 2, cx - w / 2, EYE_Y - h * 0.36, cx - w / 2, EYE_Y + h * 0.08);
      ctx.closePath();
    };
    const underLid = () => {
      ctx.beginPath();
      ctx.rect(cx - w, EYE_Y - h, w * 2, lidY - (EYE_Y - h));
      ctx.clip();
    };
    ctx.save();
    outline();
    ctx.clip();
    if (cut > 0) underLid();
    ctx.fillStyle = SCLERA;
    ctx.fillRect(cx - w, EYE_Y - h, w * 2, h * 2);
    // iris : presque toute la hauteur de l'œil, un liseré de blanc sur les côtés ; le regard le déplace
    const irx = w * IRIS.rx * iris;
    const iry = h * IRIS.ry * iris;
    const ix = cx + look[0] * (w / 2 - irx) * 0.9;
    const iy = EYE_Y + h * IRIS.dy + look[1] * (h / 2 - iry) * 0.9;
    const g = ctx.createLinearGradient(0, iy + iry, 0, iy - iry);
    g.addColorStop(0, IRIS.haut);
    g.addColorStop(0.45, IRIS.milieu);
    g.addColorStop(1, IRIS.bas);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(61, 48, 73, 0.55)';
    ctx.lineWidth = 0.004;
    ctx.stroke();
    // pupille d'encre
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(ix, iy + iry * 0.04, irx * 0.46, iry * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // deux reflets : un grand en haut, côté extérieur ; un petit en bas, côté intérieur
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ix + sx * irx * 0.32, iy + iry * 0.36, irx * 0.34, iry * 0.28, sx * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ix - sx * irx * 0.36, iy - iry * 0.46, irx * 0.14, iry * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // bas de l'œil : trait fin et léger (pas de cils)
    ctx.save();
    underLid();
    ctx.strokeStyle = 'rgba(61, 48, 73, 0.45)';
    ctx.lineWidth = 0.0035;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.36, EYE_Y - h * 0.4);
    ctx.quadraticCurveTo(cx, EYE_Y - h * 0.56, cx + w * 0.36, EYE_Y - h * 0.4);
    ctx.stroke();
    ctx.restore();
    // trait de cils épais en haut, simple, qui déborde à peine vers l'extérieur
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    if (cut > 0) {
      const t = Math.min(1, Math.abs(lidY - EYE_Y) / (h / 2));
      const hw = (w / 2) * Math.sqrt(1 - t * t) * 1.15;
      ctx.moveTo(cx - sx * hw, lidY - 0.004);
      ctx.quadraticCurveTo(cx, lidY + 0.009, cx + sx * hw * 1.1, lidY);
      ctx.stroke();
    } else {
      ctx.moveTo(cx - sx * w * 0.5, EYE_Y + h * 0.14);
      ctx.bezierCurveTo(cx - sx * w * 0.46, EYE_Y + h * 0.44, cx - sx * w * 0.22, EYE_Y + h * 0.53, cx, EYE_Y + h * 0.52);
      ctx.bezierCurveTo(cx + sx * w * 0.26, EYE_Y + h * 0.51, cx + sx * w * 0.48, EYE_Y + h * 0.42, cx + sx * w * 0.54, EYE_Y + h * 0.2);
      ctx.stroke();
    }
  }

  drawEyes(name, shape, brow) {
    const ctx = this.ctx;
    const w = shape.w;
    for (const sx of [-1, 1]) {
      const cx = sx * EYE_X;
      if (name === 'ouverts') this.openEye(cx, sx, shape);
      else if (name === 'grands') this.openEye(cx, sx, shape, { scale: 1.1, iris: 0.72 });
      else if (name === 'micl') this.openEye(cx, sx, shape, { cutTop: 0.5, look: [0, -0.4] });
      else if (name === 'concentre') this.openEye(cx, sx, shape, { cutTop: 0.2 });
      else if (name === 'effort') this.openEye(cx, sx, shape, { cutTop: 0.42, scale: 0.94 });
      else if (name === 'pensif') this.openEye(cx, sx, shape, { cutTop: 0.06, look: [0.85, 0.85] });
      else if (name === 'fermes') {
        // paupières closes : arc doux vers le bas
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.013;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.55, EYE_Y - 0.006);
        ctx.quadraticCurveTo(cx, EYE_Y - 0.034, cx + w * 0.55, EYE_Y - 0.006);
        ctx.stroke();
      } else if (name === 'joie') {
        // yeux fermés de joie, en arcs (^ ^)
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.015;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.58, EYE_Y - 0.02);
        ctx.quadraticCurveTo(cx, EYE_Y + 0.052, cx + w * 0.58, EYE_Y - 0.02);
        ctx.stroke();
      }
    }
    if (name === 'grands') this.brows(brow, { dy: 0.024, arch: 0.016 });
    else if (name === 'concentre') this.brows(brow, { dy: -0.022, tilt: 0.026, arch: -0.002 });
    else if (name === 'effort') this.brows(brow, { dy: -0.03, tilt: 0.034, arch: -0.004 });
    else if (name === 'micl') this.brows(brow, { dy: -0.006, tilt: -0.008, arch: 0.004 });
    else if (name === 'fermes') this.brows(brow, { dy: -0.004, arch: 0.006 });
    else if (name === 'joie') this.brows(brow, { dy: 0.016, arch: 0.014 });
    else if (name === 'pensif') this.brows(brow, { dy: 0.006, tilt: -0.006, arch: 0.01, side: 0.012 });
    else this.brows(brow);
    this.cheeks(name === 'joie' ? 0.68 : 0.5);
  }

  drawMouth(name) {
    const ctx = this.ctx;
    // nez minuscule : un point rosé
    ctx.fillStyle = 'rgba(222, 128, 116, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, NOSE_Y, 0.008, 0.0055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = MOUTH_INK;
    ctx.fillStyle = MOUTH_INK;
    const y = MOUTH_Y;
    if (name === 'sourire' || name === 'petite' || name === 'grandSourire') {
      const half = name === 'grandSourire' ? 0.03 : name === 'petite' ? 0.012 : 0.019;
      const depth = name === 'grandSourire' ? 0.03 : name === 'petite' ? 0.01 : 0.017;
      ctx.lineWidth = 0.009;
      ctx.beginPath();
      ctx.moveTo(-half, y + 0.004);
      ctx.quadraticCurveTo(0, y - depth, half, y + 0.004);
      ctx.stroke();
    } else if (name === 'ouverte') {
      // grande bouche ouverte de joie : haut presque droit, bas bien rond, langue rose au fond
      ctx.beginPath();
      ctx.moveTo(-0.04, y + 0.01);
      ctx.quadraticCurveTo(0, y + 0.016, 0.04, y + 0.01);
      ctx.bezierCurveTo(0.038, y - 0.04, 0.016, y - 0.066, 0, y - 0.066);
      ctx.bezierCurveTo(-0.016, y - 0.066, -0.038, y - 0.04, -0.04, y + 0.01);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ef8f8c';
      ctx.beginPath();
      ctx.ellipse(0.003, y - 0.058, 0.024, 0.017, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (name === 'o') {
      ctx.beginPath();
      ctx.ellipse(0, y - 0.006, 0.011, 0.014, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === 'baille') {
      ctx.beginPath();
      ctx.ellipse(0, y - 0.012, 0.018, 0.027, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === 'souffle') {
      ctx.beginPath();
      ctx.ellipse(0.004, y - 0.004, 0.015, 0.011, 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === 'plate') {
      ctx.lineWidth = 0.009;
      ctx.beginPath();
      ctx.moveTo(-0.015, y - 0.002);
      ctx.quadraticCurveTo(0.002, y - 0.006, 0.015, y + 0.001);
      ctx.stroke();
    } else if (name === 'coin') {
      // sourire en coin : le côté droit remonte, petit pli au bout
      ctx.lineWidth = 0.009;
      ctx.beginPath();
      ctx.moveTo(-0.018, y - 0.004);
      ctx.quadraticCurveTo(0.006, y - 0.012, 0.022, y + 0.008);
      ctx.stroke();
      ctx.lineWidth = 0.006;
      ctx.beginPath();
      ctx.moveTo(0.02, y + 0.012);
      ctx.lineTo(0.026, y + 0.004);
      ctx.stroke();
    } else if (name === 'detendue') {
      // bouche détendue du sommeil : petite, entrouverte
      ctx.beginPath();
      ctx.ellipse(0, y - 0.004, 0.009, 0.006, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
