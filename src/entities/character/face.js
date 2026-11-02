import * as THREE from 'three';

// Visage du joueur peint dans un canvas (aucune image externe).
// L'atlas 1024×1024 contient 4×4 cases de 256 px : les deux premières rangées
// pour les yeux (avec sourcils et joues), les deux dernières pour la bouche.
// Le shader du visage superpose une case « yeux » et une case « bouche » :
// toutes les combinaisons d'expressions tiennent en un seul appel de dessin.

// Géométrie de la tête (partagée avec Character.js)
export const FACE = {
  R: 0.28, // rayon du crâne
  SX: 1.06, // aplatissement
  SY: 0.98,
  PHI: 1.7, // largeur angulaire du masque facial
  TOP: 0.45, // au-dessus de l'équateur (rad)
  BOT: 0.7, // en dessous
};

const SPAN_X = FACE.PHI * FACE.R * FACE.SX; // largeur du masque en mètres
const TOP_M = FACE.TOP * FACE.R * FACE.SY;
const SPAN_Y = (FACE.TOP + FACE.BOT) * FACE.R * FACE.SY;

export const EYE = { ouverts: 0, fermes: 1, joie: 2, micl: 3, grands: 4, concentre: 5, effort: 6 };
export const MOUTH = { sourire: 8, grandSourire: 9, ouverte: 10, o: 11, plate: 12, baille: 13, petite: 14, souffle: 15 };

// Expressions = paire (yeux, bouche)
export const EXPRESSIONS = {
  neutre: [EYE.ouverts, MOUTH.sourire],
  clignement: [EYE.fermes, MOUTH.sourire],
  joie: [EYE.joie, MOUTH.grandSourire],
  joieOuverte: [EYE.joie, MOUTH.ouverte],
  concentre: [EYE.concentre, MOUTH.plate],
  endormi: [EYE.micl, MOUTH.o],
  surpris: [EYE.grands, MOUTH.o],
  content: [EYE.ouverts, MOUTH.grandSourire],
  baillement: [EYE.fermes, MOUTH.baille],
  // sprint : yeux plissés, on serre les dents puis on souffle ; après : essoufflé
  effort: [EYE.effort, MOUTH.plate],
  effortSouffle: [EYE.effort, MOUTH.souffle],
  essouffle: [EYE.micl, MOUTH.souffle],
};

// Yeux qui se ferment le temps d'un clignement
export const BLINKABLE = new Set([EYE.ouverts, EYE.grands, EYE.concentre, EYE.micl, EYE.effort]);

// Décalage et échelle UV d'une case de l'atlas
export function cellUV(i, out = new THREE.Vector4()) {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return out.set(col / 4, 1 - (row + 1) / 4, 0.25, 0.25);
}

// Calotte sphérique posée sur l'avant du crâne
export function faceGeometry() {
  const g = new THREE.SphereGeometry(FACE.R * 1.012, 20, 11, Math.PI / 2 - FACE.PHI / 2, FACE.PHI, Math.PI / 2 - FACE.TOP, FACE.TOP + FACE.BOT);
  g.scale(FACE.SX, FACE.SY, 1);
  return g;
}

const INK = '#3d3049';
const MOUTH_INK = '#7b4f5e';
// blanc de l'œil (crème, pas de blanc pur) ; iris marron : rayon (part de la largeur de l'œil),
// hauteur du centre (part de la hauteur, vers le haut), anneau sombre puis teinte claire.
// Le blanc se lit comme une partie de l'œil : l'emprise est réduite (SIZE) pour que l'œil garde la
// taille apparente de l'ancien œil d'encre.
const SCLERA = '#fdf8f0';
const IRIS = { r: 0.44, dy: 0.05, ring: '#5c3a2b', color: '#8a5a3c' };
const SIZE = 0.92;
const EYE_X = 0.098;
const EYE_Y = -0.012;
const SHAPES = {
  ovale: { w: 0.07, h: 0.112, lid: 0 },
  rond: { w: 0.088, h: 0.095, lid: 0 },
  amande: { w: 0.094, h: 0.088, lid: 0.22 },
};

export class FaceAtlas {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
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
    const x0 = (i % 4) * 256;
    const y0 = Math.floor(i / 4) * 256;
    ctx.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(x0 + 2, y0 + 2, 252, 252);
    ctx.clip();
    const sx = 256 / SPAN_X;
    const sy = 256 / SPAN_Y;
    ctx.setTransform(sx, 0, 0, -sy, x0 + 128, y0 + TOP_M * sy);
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
    ctx.clearRect(0, 0, 1024, 1024);
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

  cheeks(alpha = 0.55) {
    const ctx = this.ctx;
    for (const sx of [-1, 1]) {
      const g = ctx.createRadialGradient(sx * 0.158, -0.078, 0, sx * 0.158, -0.078, 0.044);
      g.addColorStop(0, `rgba(247, 160, 158, ${alpha})`);
      g.addColorStop(0.6, `rgba(247, 160, 158, ${alpha * 0.55})`);
      g.addColorStop(1, 'rgba(247, 160, 158, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx * 0.158, -0.078, 0.044, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  brows(color, { dy = 0, tilt = 0, arch = 0.008 } = {}) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.011;
    for (const sx of [-1, 1]) {
      const cx = sx * EYE_X;
      const y = EYE_Y + 0.085 + dy;
      // tilt > 0 : extrémité intérieure plus basse (air appliqué)
      ctx.beginPath();
      ctx.moveTo(cx - sx * 0.03, y - tilt);
      ctx.quadraticCurveTo(cx, y + arch, cx + sx * 0.03, y + tilt * 0.4);
      ctx.stroke();
    }
  }

  // Œil ouvert à la manière des films d'animation peints : blanc visible, iris marron qui touche la
  // paupière, pupille d'encre, un reflet ; trait de cils épais en haut, contour fin ailleurs. Même
  // emprise que l'ancien œil d'encre (forme miniature). iris < 1 : iris plus petit (surprise).
  openEye(cx, shape, { scale = 1, cutTop = 0, iris = 1 } = {}) {
    const ctx = this.ctx;
    const w = shape.w * scale * SIZE;
    const h = shape.h * scale * SIZE;
    const cut = Math.max(cutTop, shape.lid);
    // hauteur de la paupière supérieure (le haut de l'ellipse quand l'œil est grand ouvert)
    const lidY = EYE_Y + h / 2 - h * cut;
    const outline = () => {
      ctx.beginPath();
      ctx.ellipse(cx, EYE_Y, w / 2, h / 2, 0, 0, Math.PI * 2);
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
    // iris haut placé, qui suit l'allongement de l'œil : un liseré de blanc sur les côtés, un peu plus
    // dessous ; paupière baissée, l'iris descend pour qu'on en voie la moitié basse
    const ir = w * IRIS.r * iris;
    const iry = ir * Math.min(1.35, Math.max(1, (0.85 * h) / w));
    const iy = Math.min(EYE_Y + h * IRIS.dy, lidY - iry * 0.15);
    ctx.fillStyle = IRIS.ring;
    ctx.beginPath();
    ctx.ellipse(cx, iy, ir, iry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = IRIS.color;
    ctx.beginPath();
    ctx.ellipse(cx, iy, ir * 0.8, iry * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(cx, iy, ir * 0.42, iry * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    // ombre douce de la paupière sur le haut de l'œil
    ctx.fillStyle = 'rgba(123, 79, 94, 0.2)';
    ctx.fillRect(cx - w, lidY - h * 0.12, w * 2, h * 0.12);
    // reflet
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx + ir * 0.36, iy + iry * 0.36, ir * 0.3, ir * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // contour fin sous la paupière
    ctx.save();
    underLid();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.0045;
    outline();
    ctx.stroke();
    ctx.restore();
    // trait de cils : l'arc du haut de l'œil, ou la paupière baissée (à peine bombée)
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.013;
    ctx.beginPath();
    if (cut > 0) {
      const t = Math.min(1, Math.abs(lidY - EYE_Y) / (h / 2));
      const hw = (w / 2) * Math.sqrt(1 - t * t) * 1.12;
      ctx.moveTo(cx - hw, lidY - 0.003);
      ctx.quadraticCurveTo(cx, lidY + 0.008, cx + hw, lidY - 0.003);
    } else {
      for (let k = 0; k <= 12; k++) {
        const a = Math.PI * (0.06 + (0.88 * k) / 12);
        const x = cx + Math.cos(a) * (w / 2);
        const y = EYE_Y + Math.sin(a) * (h / 2);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  drawEyes(name, shape, brow) {
    const ctx = this.ctx;
    ctx.strokeStyle = INK;
    for (const sx of [-1, 1]) {
      const cx = sx * EYE_X;
      const w = shape.w;
      if (name === 'ouverts') this.openEye(cx, shape);
      else if (name === 'grands') this.openEye(cx, shape, { scale: 1.12, iris: 0.82 });
      else if (name === 'micl') this.openEye(cx, shape, { cutTop: 0.5 });
      else if (name === 'concentre') this.openEye(cx, shape, { cutTop: 0.24 });
      else if (name === 'effort') this.openEye(cx, shape, { cutTop: 0.42, scale: 0.94 });
      else if (name === 'fermes') {
        // paupières closes, courbe douce vers le bas
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.6, EYE_Y - 0.004);
        ctx.quadraticCurveTo(cx, EYE_Y - 0.028, cx + w * 0.6, EYE_Y - 0.004);
        ctx.stroke();
      } else if (name === 'joie') {
        // yeux plissés de joie (^ ^)
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.013;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.62, EYE_Y - 0.014);
        ctx.quadraticCurveTo(cx, EYE_Y + 0.05, cx + w * 0.62, EYE_Y - 0.014);
        ctx.stroke();
      }
    }
    if (name === 'grands') this.brows(brow, { dy: 0.02, arch: 0.016 });
    else if (name === 'concentre') this.brows(brow, { dy: -0.03, tilt: 0.022, arch: -0.002 });
    else if (name === 'effort') this.brows(brow, { dy: -0.036, tilt: 0.034, arch: -0.004 });
    else if (name === 'micl') this.brows(brow, { dy: -0.008, tilt: -0.008, arch: 0.004 });
    else if (name === 'joie') this.brows(brow, { dy: 0.012, arch: 0.012 });
    else this.brows(brow);
    this.cheeks(name === 'joie' ? 0.72 : 0.55);
  }

  drawMouth(name) {
    const ctx = this.ctx;
    // petit nez peint, présent sous toutes les bouches
    ctx.fillStyle = 'rgba(214, 118, 108, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, -0.05, 0.014, 0.009, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 246, 236, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-0.004, -0.046, 0.0045, 0.003, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = MOUTH_INK;
    ctx.fillStyle = MOUTH_INK;
    const y = -0.096;
    if (name === 'sourire' || name === 'petite' || name === 'grandSourire') {
      const half = name === 'grandSourire' ? 0.033 : name === 'petite' ? 0.014 : 0.022;
      const depth = name === 'grandSourire' ? 0.034 : name === 'petite' ? 0.014 : 0.022;
      ctx.lineWidth = name === 'grandSourire' ? 0.0105 : 0.0095;
      ctx.beginPath();
      ctx.moveTo(-half, y + 0.004);
      ctx.quadraticCurveTo(0, y - depth, half, y + 0.004);
      ctx.stroke();
    } else if (name === 'ouverte') {
      ctx.beginPath();
      ctx.moveTo(-0.034, y + 0.006);
      ctx.lineTo(0.034, y + 0.006);
      ctx.quadraticCurveTo(0, y - 0.064, -0.034, y + 0.006);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#f0938f';
      ctx.beginPath();
      ctx.ellipse(0, y - 0.03, 0.017, 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (name === 'o') {
      ctx.beginPath();
      ctx.ellipse(0, y - 0.006, 0.013, 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === 'baille') {
      ctx.beginPath();
      ctx.ellipse(0, y - 0.01, 0.02, 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === 'souffle') {
      // petite bouche ronde qui souffle, un peu de travers
      ctx.beginPath();
      ctx.ellipse(0.004, y - 0.004, 0.017, 0.012, 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === 'plate') {
      ctx.lineWidth = 0.0095;
      ctx.beginPath();
      ctx.moveTo(-0.016, y - 0.002);
      ctx.quadraticCurveTo(0.002, y - 0.006, 0.016, y + 0.001);
      ctx.stroke();
    }
  }
}
