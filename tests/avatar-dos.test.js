// Emplacement « dos » (le sac des planches, porté avec l'écharpe) : look par défaut, reprise des
// sauvegardes qui portaient le sac en accessoire, garde-robe.
import { describe, it, expect } from 'vitest';
import { defaultAvatar, sanitizeAvatar, sanitizeWardrobe, piecesOf, CLOTH_COLORS } from '../src/entities/character/avatar.js';

describe('avatar : emplacement « dos »', () => {
  it('le look par défaut porte l’écharpe et le sac', () => {
    const d = defaultAvatar();
    expect([d.accessory, d.back]).toEqual(['echarpe', 'sac']);
    expect(CLOTH_COLORS[d.backColor]).toBe('#e07a4f');
    expect(piecesOf('back')).toEqual(['sac']);
    expect(piecesOf('accessory')).not.toContain('sac');
  });

  it('une ancienne sauvegarde qui portait le sac en accessoire le retrouve au dos, avec sa couleur', () => {
    const old = { ...defaultAvatar(), accessory: 'sac', accessoryColor: 3 };
    delete old.back;
    delete old.backColor;
    const a = sanitizeAvatar(old);
    expect([a.accessory, a.back, a.backColor]).toEqual([null, 'sac', 3]);
  });

  it('une ancienne sauvegarde sans sac n’en reçoit pas ; un dos vide reste vide', () => {
    const old = { ...defaultAvatar(), accessory: 'lunettes' };
    delete old.back;
    delete old.backColor;
    const a = sanitizeAvatar(old);
    expect([a.accessory, a.back]).toEqual(['lunettes', null]);
    expect(sanitizeAvatar({ ...defaultAvatar(), back: null }).back).toBe(null);
    expect(sanitizeAvatar({ ...defaultAvatar(), back: 'chapeau' }).back).toBe('sac');
  });

  it('la garde-robe contient le sac (pièce de départ) et ce que porte le dos', () => {
    const av = sanitizeAvatar(defaultAvatar());
    expect(sanitizeWardrobe([], av)).toContain('sac');
  });
});
