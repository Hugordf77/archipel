// Cheveux du personnage : une seule coupe (en pics), vers laquelle retombent les anciennes sauvegardes.
import { describe, expect, it } from 'vitest';
import { HAIRS, defaultAvatar, sanitizeAvatar } from '../src/entities/character/avatar.js';
import { migrate } from '../src/core/state.js';
import { HAIR_STYLES } from '../src/models/personnage/index.js';

describe('coupe unique en pics', () => {
  it('est la seule coupe, celle du look par défaut, et elle a sa géométrie', () => {
    expect(Object.keys(HAIRS)).toEqual(['pics']);
    expect(Object.keys(HAIR_STYLES)).toEqual(['pics']);
    expect(defaultAvatar().hair).toBe('pics');
  });

  it('remplace les anciennes coupes des sauvegardes, sans toucher au reste du look', () => {
    for (const old of ['bol', 'carre', 'queue', 'macarons', 'boucles', 'longs', undefined, 42]) {
      const raw = { ...defaultAvatar(), hair: old, hairColor: 4, eyes: 'amande', top: 'gilet' };
      const av = sanitizeAvatar(raw);
      expect(av.hair).toBe('pics');
      expect(av.hairColor).toBe(4);
      expect(av.eyes).toBe('amande');
      expect(av.top).toBe('gilet');
      expect(migrate({ version: 2, avatar: raw }).avatar.hair).toBe('pics');
    }
  });
});
