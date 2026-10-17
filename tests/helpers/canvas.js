// Toile 2D factice pour Node : les textures peintes (feuillages, visage) se construisent
// sans navigateur. Chaque appel de dessin est accepté et ne fait rien.
export function installCanvasStub() {
  if (globalThis.document?.createElement) return;
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createPattern') return () => gradient;
      if (key === 'createImageData' || key === 'getImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      if (key === 'measureText') return () => ({ width: 0 });
      return noop;
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => ctx, addEventListener: noop, toDataURL: () => '' });
  globalThis.document = { createElement: (tag) => (tag === 'canvas' ? canvas() : { style: {} }), createElementNS: () => canvas() };
}
