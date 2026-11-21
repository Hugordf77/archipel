// Icônes SVG originales, traits arrondis, couleurs pastel.
const S = (body, vb = '0 0 32 32') =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICON = {
  shell: S(`<path d="M16 5c-6.5 0-11 5.2-11 11.5 0 3 1.6 5.4 3.6 6.7l1.1 3.3c.3.9 1.1 1.5 2 1.5h8.6c.9 0 1.7-.6 2-1.5l1.1-3.3c2-1.3 3.6-3.7 3.6-6.7C27 10.2 22.5 5 16 5z" fill="#ffd7c4" stroke="#c9826b" stroke-width="2"/><path d="M16 8v17M11 9.5l2.5 15M21 9.5l-2.5 15M7.5 13.5l4.2 10M24.5 13.5l-4.2 10" stroke="#e3a48b" stroke-width="1.6" fill="none"/>`),
  book: S(`<path d="M5 8c3-1.5 7-1.5 11 1 4-2.5 8-2.5 11-1v17c-3-1.5-7-1.5-11 1-4-2.5-8-2.5-11-1z" fill="#fff4e2" stroke="#9f6b48" stroke-width="2"/><path d="M16 9v17" stroke="#9f6b48" stroke-width="2"/><path d="M8.5 12.5c2-.6 3.8-.4 5 .4M8.5 16.5c2-.6 3.8-.4 5 .4M18.5 12.9c1.2-.8 3-1 5-.4M18.5 16.9c1.2-.8 3-1 5-.4" stroke="#d9b48f" stroke-width="1.5" fill="none"/>`),
  journal: S(`<rect x="7" y="4.5" width="19" height="23" rx="3" fill="#f4a28c" stroke="#b9705f" stroke-width="2"/><rect x="10.5" y="4.5" width="2.4" height="23" fill="#e98a74"/><rect x="15" y="10" width="8" height="5" rx="1.5" fill="#fff4e2"/><path d="M26 9h2.5M26 14h2.5M26 19h2.5" stroke="#b9705f" stroke-width="2"/>`),
  tasks: S(`<path d="M12 4h8v4.5c3 1.4 5 4.6 5 8.5v8.5c0 1.4-1.1 2.5-2.5 2.5h-13C8.1 28 7 26.9 7 25.5V17c0-3.9 2-7.1 5-8.5z" fill="#bfe8de" stroke="#5aa995" stroke-width="2"/><rect x="11" y="2.5" width="10" height="3.5" rx="1.5" fill="#d9a273" stroke="#9f6b48" stroke-width="1.6"/><path d="M11.5 18l3 3 6-6.5" stroke="#5aa995" stroke-width="2.4" fill="none"/>`),
  gear: S(`<path d="M16 10.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" fill="#fff4e2" stroke="#7a6a8a" stroke-width="2"/><path d="M16 3.5v3.2M16 25.3v3.2M3.5 16h3.2M25.3 16h3.2M7.2 7.2l2.3 2.3M22.5 22.5l2.3 2.3M7.2 24.8l2.3-2.3M22.5 9.5l2.3-2.3" stroke="#7a6a8a" stroke-width="3"/>`),
  sound: S(`<path d="M5 12.5h5l6-5v17l-6-5H5z" fill="#fff4e2" stroke="#7a6a8a" stroke-width="2"/><path d="M20.5 11.5c1.6 1.2 2.5 2.8 2.5 4.5s-.9 3.3-2.5 4.5M23.5 8c2.8 2 4.5 4.9 4.5 8s-1.7 6-4.5 8" stroke="#7a6a8a" stroke-width="2" fill="none"/>`),
  mute: S(`<path d="M5 12.5h5l6-5v17l-6-5H5z" fill="#fff4e2" stroke="#7a6a8a" stroke-width="2"/><path d="M21 12.5l7 7M28 12.5l-7 7" stroke="#e98a74" stroke-width="2.4"/>`),
  leaf: S(`<path d="M6 26C6 13 14 6 27 5c-1 13-8 21-21 21z" fill="#a6d98f" stroke="#5c9e5a" stroke-width="2"/><path d="M6 26C11 20 15 16 21 11" stroke="#5c9e5a" stroke-width="2" fill="none"/>`),
  clock: S(`<circle cx="16" cy="17" r="11" fill="#fff4e2" stroke="#7a6a8a" stroke-width="2"/><path d="M16 11v6.5l4 2.5" stroke="#7a6a8a" stroke-width="2.4" fill="none"/><path d="M12 3.5h8" stroke="#7a6a8a" stroke-width="2.4"/>`),
  focus: S(`<circle cx="16" cy="16" r="11" fill="#bfe8de" stroke="#5aa995" stroke-width="2"/><circle cx="16" cy="16" r="5.5" fill="#fff4e2" stroke="#5aa995" stroke-width="2"/><circle cx="16" cy="16" r="1.8" fill="#5aa995"/>`),
  pause: S(`<rect x="9" y="7" width="5" height="18" rx="2" fill="#fff4e2" stroke="#7a6a8a" stroke-width="2"/><rect x="18" y="7" width="5" height="18" rx="2" fill="#fff4e2" stroke="#7a6a8a" stroke-width="2"/>`),
  play: S(`<path d="M10 6.5v19c0 1 1.1 1.6 2 1.1l14.5-9.5c.8-.5.8-1.7 0-2.2L12 5.4c-.9-.5-2 .1-2 1.1z" fill="#bfe8de" stroke="#5aa995" stroke-width="2"/>`),
  stop: S(`<rect x="7.5" y="7.5" width="17" height="17" rx="4" fill="#ffd7c4" stroke="#c9826b" stroke-width="2"/>`),
  close: S(`<path d="M9 9l14 14M23 9L9 23" stroke="#7a6a8a" stroke-width="3" fill="none"/>`),
  plus: S(`<path d="M16 7v18M7 16h18" stroke="#5aa995" stroke-width="3.2" fill="none"/>`),
  owl: S(`<ellipse cx="16" cy="18" rx="10" ry="10.5" fill="#c9a07e" stroke="#8a6248" stroke-width="2"/><circle cx="12" cy="15" r="4" fill="#fff4e2" stroke="#8a6248" stroke-width="1.6"/><circle cx="20" cy="15" r="4" fill="#fff4e2" stroke="#8a6248" stroke-width="1.6"/><circle cx="12" cy="15" r="1.7" fill="#3d3049"/><circle cx="20" cy="15" r="1.7" fill="#3d3049"/><path d="M14.6 19l1.4 2 1.4-2z" fill="#f6c46d"/><path d="M8 9l3 2.5M24 9l-3 2.5" stroke="#8a6248" stroke-width="2"/>`),
  bottle: S(`<path d="M13 3.5h6v5c3 1.3 4.5 3.8 4.5 7V26c0 1.4-1.1 2.5-2.5 2.5H11c-1.4 0-2.5-1.1-2.5-2.5V15.5c0-3.2 1.5-5.7 4.5-7z" fill="#bfe8de" stroke="#5aa995" stroke-width="2"/><rect x="12.5" y="2" width="7" height="3.5" rx="1.2" fill="#d9a273" stroke="#9f6b48" stroke-width="1.5"/><rect x="11.5" y="15" width="9" height="8" rx="1" fill="#fff4e2" stroke="#c9b48f" stroke-width="1.2" transform="rotate(-8 16 19)"/>`),
  stamp: S(`<circle cx="16" cy="16" r="11.5" fill="none" stroke="#e98a74" stroke-width="2.4"/><circle cx="16" cy="16" r="8" fill="none" stroke="#e98a74" stroke-width="1.4" stroke-dasharray="2 2"/><path d="M11.5 16.5l3 3 6-6.5" stroke="#e98a74" stroke-width="2.4" fill="none"/>`),
  flame: S(`<path d="M16 3.5c1 4.5 6.5 7.5 6.5 14a6.5 6.5 0 0 1-13 0c0-3.4 1.6-5.6 3.5-7.4.2 2 1 3.4 2.4 4.1-.7-4.2.2-7.6.6-10.7z" fill="#f6c46d" stroke="#e08a5a" stroke-width="2"/><path d="M16 17.5c1.6 1.6 2.8 3 2.8 4.6a2.8 2.8 0 0 1-5.6 0c0-1.6 1.2-3 2.8-4.6z" fill="#fff4e2"/>`),
  shop: S(`<path d="M5 13h22v13.5c0 .8-.7 1.5-1.5 1.5h-19c-.8 0-1.5-.7-1.5-1.5z" fill="#fff4e2" stroke="#9f6b48" stroke-width="2"/><path d="M4 13l3-7.5h18l3 7.5z" fill="#9fdcc8" stroke="#5aa995" stroke-width="2"/><path d="M10 13l1.5-7.5M16 13V5.5M22 13l-1.5-7.5" stroke="#5aa995" stroke-width="1.6"/><rect x="12.5" y="19" width="7" height="9" rx="1" fill="#e0b07e" stroke="#9f6b48" stroke-width="1.6"/>`),
  water: S(`<path d="M7 13h13v11c0 1.7-1.3 3-3 3h-7c-1.7 0-3-1.3-3-3z" fill="#9cc8ec" stroke="#5a8fb8" stroke-width="2"/><path d="M20 15l6-4.5M7.5 15c-2.5 0-3.5 1.6-3.5 3.5" stroke="#5a8fb8" stroke-width="2.2" fill="none"/><path d="M27 13.5c.8 1.4 1.4 2.3 1.4 3.1a1.4 1.4 0 0 1-2.8 0c0-.8.6-1.7 1.4-3.1z" fill="#9cc8ec"/>`),
  pad: S(`<path d="M9.5 10.5h13c3.3 0 5.6 2.4 6.1 5.8l.9 6.2c.4 2.8-2.6 4.6-4.7 2.8l-3.3-2.8h-11l-3.3 2.8c-2.1 1.8-5.1 0-4.7-2.8l.9-6.2c.5-3.4 2.8-5.8 6.1-5.8z" fill="#c7b2e6" stroke="#7d68a3" stroke-width="1.8"/><path d="M9.5 14.5v4M7.5 16.5h4" stroke="#fffaf0" stroke-width="1.8"/><circle cx="21.5" cy="15.2" r="1.2" fill="#fffaf0"/><circle cx="24" cy="17.6" r="1.2" fill="#fffaf0"/>`),
  sparkle: S(`<path d="M16 4l2.6 8.4L27 15l-8.4 2.6L16 26l-2.6-8.4L5 15l8.4-2.6z" fill="#f6d27a" stroke="#d9a24a" stroke-width="1.6"/>`),
};

// Illustrations des états vides (traits ronds, aplats pastel)
const L = (body) => `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const ILLU = {
  carnet: L(`<ellipse cx="80" cy="104" rx="58" ry="8" fill="#e9dcc4"/><path d="M22 34c18-8 38-8 58 4 20-12 40-12 58-4v62c-18-8-38-8-58 4-20-12-40-12-58-4z" fill="#fffaf0" stroke="#c9826b" stroke-width="3"/><path d="M80 38v62" stroke="#c9826b" stroke-width="3"/><path d="M34 52c10-3 20-3 30 1M34 64c10-3 20-3 30 1M34 76c10-3 20-3 30 1" stroke="#e3cfae" stroke-width="2.4" fill="none"/><circle cx="112" cy="66" r="15" fill="none" stroke="#f4a28c" stroke-width="3" stroke-dasharray="4 4"/><path d="M112 82V60" stroke="#6cb59e" stroke-width="3"/><path d="M112 66c-9-1-13-7-13-13 7 0 12 4 13 13zM112 62c8-2 12-8 12-14-7 1-11 6-12 14z" fill="#a6d98f" stroke="#6cb59e" stroke-width="2"/>`),
  hibou: L(`<ellipse cx="80" cy="106" rx="50" ry="7" fill="#e9dcc4"/><ellipse cx="62" cy="68" rx="26" ry="30" fill="#d7ad89" stroke="#9a6f50" stroke-width="3"/><circle cx="52" cy="60" r="9" fill="#fffaf0" stroke="#9a6f50" stroke-width="2"/><circle cx="72" cy="60" r="9" fill="#fffaf0" stroke="#9a6f50" stroke-width="2"/><circle cx="52" cy="60" r="3.6" fill="#3d3049"/><circle cx="72" cy="60" r="3.6" fill="#3d3049"/><path d="M59 70l3 5 3-5z" fill="#f6c46d"/><path d="M42 40l6 7M82 40l-6 7" stroke="#9a6f50" stroke-width="3"/><rect x="88" y="52" width="48" height="34" rx="4" fill="#fffdf7" stroke="#9cc8ec" stroke-width="3" transform="rotate(8 112 69)"/><path d="M96 66h30M96 75h22" stroke="#f4a28c" stroke-width="2.6" transform="rotate(8 112 69)"/>`),
  bouteille: L(`<path d="M10 98c18-8 30-8 46 0s30 8 46 0 30-8 48 0" stroke="#7fc6d6" stroke-width="4" fill="none"/><path d="M14 108c18-6 30-6 46 0s30 6 46 0 30-6 44 0" stroke="#bfe8de" stroke-width="3" fill="none"/><g transform="rotate(-24 80 70)"><path d="M70 30h20v16c9 4 14 12 14 22v26c0 4-3 7-7 7H63c-4 0-7-3-7-7V68c0-10 5-18 14-22z" fill="#bfe8de" stroke="#5aa995" stroke-width="3"/><rect x="68" y="22" width="24" height="10" rx="3" fill="#d9a273" stroke="#9f6b48" stroke-width="2.4"/><rect x="66" y="58" width="28" height="24" rx="2" fill="#fffaf0" stroke="#c9b48f" stroke-width="2"/></g>`),
};

ICON.mirror = S(`<ellipse cx="16" cy="13" rx="8" ry="10" fill="#dcecf2" stroke="#9f6b48" stroke-width="2.4"/><path d="M12.8 8.5l-1.6 6" stroke="#fffaf0" stroke-width="2"/><path d="M11 23l-2 6M21 23l2 6M7 29h5M20 29h5" stroke="#9f6b48" stroke-width="2.2"/>`);
ICON.hanger = S(`<path d="M13.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v1.3L5.3 21.3c-.9.6-.5 2 .6 2h20.2c1.1 0 1.5-1.4.6-2L16 14.5" fill="none" stroke="#9f6b48" stroke-width="2.2"/>`);
ICON.lock = S(`<rect x="8" y="14" width="16" height="12" rx="3" fill="#f3e6cf" stroke="#7a6a8a" stroke-width="2"/><path d="M11.5 14v-3a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#7a6a8a" stroke-width="2"/>`);

// Pictogrammes des pièces de la garde-robe, teintés à la couleur choisie
const PIECE_PATHS = {
  tshirt: '<path d="M11 6L5 10l2.5 4.5 3-1.5V27h11V13l3 1.5L27 10l-6-4c-1 1.8-2.8 2.8-5 2.8S12 7.8 11 6z"/>',
  pull: '<path d="M11 6L5 9l-1.5 13 3.5.5 2.5-10V27h13V12.5l2.5 10 3.5-.5L27 9l-6-3c-1 1.8-2.8 2.8-5 2.8S12 7.8 11 6z"/><path d="M10.5 16h11M10.5 21h11" stroke="#fffaf0" stroke-width="2.2"/>',
  gilet: '<path d="M11 6L5 9l-1.5 13 3.5.5 2.5-10V27h13V12.5l2.5 10 3.5-.5L27 9l-6-3c-1 1.8-2.8 2.8-5 2.8S12 7.8 11 6z"/><path d="M16 9v18" stroke="#fffaf0" stroke-width="2.2"/><circle cx="18.5" cy="14" r="1" fill="#f2c14e" stroke="none"/><circle cx="18.5" cy="19" r="1" fill="#f2c14e" stroke="none"/>',
  robe: '<path d="M12 5h8l1 4 5 18H6l5-18z"/>',
  short: '<path d="M8 8h16l1 13h-7l-2-6-2 6H7z"/>',
  jupe: '<path d="M10 9h12l5 15H5z"/>',
  pantalon: '<path d="M9 5h14l1 22h-6l-2-14-2 14H8z"/>',
  salopette: '<path d="M9 12h14l1 15h-6l-2-9-2 9H8z"/><path d="M11 12V6h10v6M11 6l-1-3M21 6l1-3"/>',
  baskets: '<path d="M5 20c0-3 2-6 5-6l4 3 6 1c3 .5 7 2 7 5v2H5z"/><path d="M5 23.5h22" stroke="#fffaf0" stroke-width="2"/>',
  bottes: '<path d="M10 4h8v14l7 3v5H10z"/>',
  sandales: '<ellipse cx="16" cy="23" rx="11" ry="3.5"/><path d="M9 21c2-5 12-5 14 0" fill="none"/>',
  marche: '<path d="M9 6h10v11l6 2.5c1.8.8 3 2.3 3 4V25H6V9c0-1.7 1.3-3 3-3z"/><path d="M6 25.5h22" stroke="#fffaf0" stroke-width="2.4"/><path d="M14 13h5M15 17h5" fill="none" stroke="#fffaf0" stroke-width="1.6"/>',
  echarpe: '<path d="M7 8c3 3 15 3 18 0v5c-3 3-15 3-18 0z"/><path d="M18 14v12h5V13"/>',
  bob: '<path d="M9 17c0-6 3.2-10 7-10s7 4 7 10z"/><path d="M4 18h24c0 2-4 3.5-12 3.5S4 20 4 18z"/>',
  barrette: '<path d="M16 16L6 10v12zM16 16l10-6v12z"/><circle cx="16" cy="16" r="2.6" fill="#fffaf0"/>',
  lunettes: '<circle cx="10" cy="17" r="5" fill="#fffaf0"/><circle cx="22" cy="17" r="5" fill="#fffaf0"/><path d="M15 16.5h2M5 15l-2-2M27 15l2-2" fill="none"/>',
  sac: '<rect x="8" y="9" width="16" height="18" rx="5"/><path d="M8 15h16" fill="none"/><path d="M12 9c0-3 8-3 8 0" fill="none"/>',
};

export function pieceIcon(kind, color = '#e8705f') {
  return S(`<g fill="${color}" stroke="#6b5a72" stroke-width="1.8">${PIECE_PATHS[kind] || ''}</g>`);
}

ICON.map = S(`<path d="M4 8l7-3 10 3 7-3v19l-7 3-10-3-7 3z" fill="#fff4e2" stroke="#9f6b48" stroke-width="2"/><path d="M11 5v19M21 8v19" stroke="#c9a37e" stroke-width="1.6"/><path d="M14 13l3 3m0-3l-3 3" stroke="#e98a74" stroke-width="2"/><path d="M6.5 18c2-1 3 .5 4.5-.5" stroke="#8fc4ec" stroke-width="1.6" fill="none"/>`);
ICON.compass = S(`<circle cx="16" cy="16" r="12" fill="#fff4e2" stroke="#9f6b48" stroke-width="2"/><path d="M16 6l3.2 10L16 26l-3.2-10z" fill="#e98a74" stroke="#9f6b48" stroke-width="1.4"/><path d="M16 16l3.2 0L16 26z" fill="#9fdcc8"/>`);
ICON.boat = S(`<path d="M5 20h22l-3.5 6h-15z" fill="#e0b07e" stroke="#9f6b48" stroke-width="2"/><path d="M16 4v15" stroke="#9f6b48" stroke-width="2"/><path d="M16.5 5c5 3 7.5 8 7.5 13h-7.5z" fill="#fffaf0" stroke="#9f6b48" stroke-width="1.6"/>`);

// --- navigation ---
ICON.wind = S(`<path d="M4 12h15a4 4 0 1 0-4-4M4 17h21a3.5 3.5 0 1 1-3.5 3.5M4 22h10" stroke="#3f8f8a" stroke-width="2.4" fill="none"/>`);
ICON.home = S(`<path d="M5 15L16 6l11 9" fill="none" stroke="#9f6b48" stroke-width="2.4"/><path d="M8 13.5V26h16V13.5" fill="#fff4e2" stroke="#9f6b48" stroke-width="2"/><path d="M13.5 26v-6h5v6" fill="#f4a28c" stroke="#9f6b48" stroke-width="1.8"/>`);
ICON.pin = S(`<path d="M16 28s-8-8.5-8-14a8 8 0 0 1 16 0c0 5.5-8 14-8 14z" fill="#f4a28c" stroke="#b9705f" stroke-width="2"/><circle cx="16" cy="14" r="3" fill="#fff4e2"/>`);
ICON.chest = S(`<rect x="5" y="13" width="22" height="13" rx="2" fill="#e0b07e" stroke="#9f6b48" stroke-width="2"/><path d="M5 13c0-4 3-7 11-7s11 3 11 7z" fill="#c98f5f" stroke="#9f6b48" stroke-width="2"/><rect x="14" y="15" width="4" height="5" rx="1" fill="#f6d27a" stroke="#9f6b48" stroke-width="1.4"/>`);
ICON.island = S(`<path d="M3 23c4-2 8-2 13 0s9 2 13 0" stroke="#7fc6d6" stroke-width="2.2" fill="none"/><path d="M7 21c1-5 5-8 9-8s8 3 9 8z" fill="#a6d98f" stroke="#5c9e5a" stroke-width="2"/><path d="M15 13V6c3 0 5 1.5 6 3.5" stroke="#9f6b48" stroke-width="2" fill="none"/>`);
