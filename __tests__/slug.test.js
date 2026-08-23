import { describe, it, expect } from 'vitest';
import { buildSlug, getShortIdFromSlug, isUUID } from '../src/lib/slug';

describe('slug.js', () => {
  describe('buildSlug', () => {
    it('creates a slug from title and id', () => {
      const slug = buildSlug('Laptop ASUS VivoBook 15', '3f2a8c1e-9b8e-4b6a-8b1a-9b1b4c9b2a1a');
      expect(slug).toBe('laptop-asus-vivobook-15-3f2a8c1e');
    });

    it('strips special characters and multiple spaces', () => {
      const slug = buildSlug('  Laptop   ASUS! @#$ VivoBook  ', '3f2a8c1e');
      expect(slug).toBe('laptop-asus-vivobook-3f2a8c1e');
    });

    it('strips diacritics', () => {
      const slug = buildSlug('Café Mědân', '3f2a8c1e');
      expect(slug).toBe('cafe-medan-3f2a8c1e');
    });

    it('uses "produk" as fallback if title is empty', () => {
      expect(buildSlug('', '3f2a8c1e')).toBe('produk-3f2a8c1e');
      expect(buildSlug(null, '3f2a8c1e')).toBe('produk-3f2a8c1e');
    });

    it('truncates very long titles to 60 characters', () => {
      const longTitle = 'a'.repeat(100);
      const slug = buildSlug(longTitle, '3f2a8c1e');
      expect(slug).toBe('a'.repeat(60) + '-3f2a8c1e');
    });
  });

  describe('getShortIdFromSlug', () => {
    it('extracts short id from the end of a slug', () => {
      expect(getShortIdFromSlug('laptop-asus-vivobook-15-3f2a8c1e')).toBe('3f2a8c1e');
    });

    it('returns empty string if slug is empty', () => {
      expect(getShortIdFromSlug('')).toBe('');
      expect(getShortIdFromSlug(null)).toBe('');
    });
  });

  describe('isUUID', () => {
    it('returns true for a valid UUID', () => {
      expect(isUUID('3f2a8c1e-9b8e-4b6a-8b1a-9b1b4c9b2a1a')).toBe(true);
      expect(isUUID('3F2A8C1E-9B8E-4B6A-8B1A-9B1B4C9B2A1A')).toBe(true);
    });

    it('returns false for invalid UUIDs', () => {
      expect(isUUID('3f2a8c1e')).toBe(false);
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('')).toBe(false);
      expect(isUUID('3f2a8c1e-9b8e-4b6a-8b1a-9b1b4c9b2a1g')).toBe(false); // g is invalid hex
    });
  });
});
