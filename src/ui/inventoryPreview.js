// Aperçu du personnage dans l'inventaire : un second personnage, rendu dans un petit
// canevas à part pendant que le jeu est en pause. Le moteur de rendu est créé une
// seule fois puis réutilisé (pas un contexte WebGL par ouverture).
import * as THREE from 'three';
import { GABARIT } from '../models/personnage/gabarit.js';
import { U } from '../core/globals.js';
import { Character } from '../entities/character/Character.js';

let shared = null;

function build(avatar) {
  const canvas = document.createElement('canvas');
  canvas.className = 'inv2-preview-canvas';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  // même convention de sortie que le jeu (les matériaux écrivent déjà la couleur finale)
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 0.8, 0.1, 30);
  camera.position.set(0, GABARIT.apercu.cam, 4.6);
  camera.lookAt(0, GABARIT.apercu.vise, 0);
  const character = new Character(avatar);
  scene.add(character.root);
  return { canvas, renderer, scene, camera, character, yaw: 0.35, animOk: true, avatarKey: '' };
}

// Lumière de studio le temps d'un rendu : ni courbure, ni ombre portée, ni brouillard, ni nuit
const STUDIO_SUN = new THREE.Vector3(-0.45, 0.75, 0.55).normalize();
function withStudio(fn) {
  const saved = {
    curv: U.uCurvature.value,
    shadow: U.uShadowOn.value,
    fog: U.uFogRange.value.clone(),
    night: U.uNight.value,
    snow: U.uSnow.value,
    wet: U.uWet.value,
    sun: U.uSunDir.value.clone(),
  };
  U.uCurvature.value = 0;
  U.uShadowOn.value = 0;
  U.uFogRange.value.set(500, 600);
  U.uNight.value = 0;
  U.uSnow.value = 0;
  U.uWet.value = 0;
  U.uSunDir.value.copy(STUDIO_SUN);
  try {
    fn();
  } finally {
    U.uCurvature.value = saved.curv;
    U.uShadowOn.value = saved.shadow;
    U.uFogRange.value.copy(saved.fog);
    U.uNight.value = saved.night;
    U.uSnow.value = saved.snow;
    U.uWet.value = saved.wet;
    U.uSunDir.value.copy(saved.sun);
  }
}

export function characterPreview(avatar) {
  if (!shared) shared = build(avatar);
  const p = shared;
  const key = JSON.stringify(avatar);
  if (key !== p.avatarKey) {
    p.character.setAvatar(avatar);
    p.avatarKey = key;
  }
  p.character.setPose('idle');
  return {
    canvas: p.canvas,
    // taille en pixels CSS du cadre qui l'accueille
    resize(w, h) {
      if (w < 2 || h < 2) return;
      p.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      p.renderer.setSize(w, h, false);
      p.camera.aspect = w / h;
      p.camera.updateProjectionMatrix();
    },
    rotate(d) {
      p.yaw += d;
    },
    render(dt) {
      p.character.root.rotation.y = p.yaw;
      // respiration et clignements ; si l'animation échoue hors du monde, on garde la pose
      if (p.animOk) {
        try {
          p.character.update(dt, 0, null);
        } catch (e) {
          p.animOk = false;
          console.warn('Aperçu du personnage : animation désactivée', e);
        }
      }
      withStudio(() => p.renderer.render(p.scene, p.camera));
    },
  };
}
