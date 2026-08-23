import { describe, it, expect } from 'vitest';
import { angkaSetelan, adFeeFrom, soldFeeFrom, featuredRateFrom, rupiah, TARIF_BAWAAN } from '../src/lib/fees';

describe('fees.js', () => {
  describe('angkaSetelan', () => {
    it('returns the number if valid', () => {
      expect(angkaSetelan(5000, 1000)).toBe(5000);
      expect(angkaSetelan(0, 1000)).toBe(0); // 0 is valid and shouldn't fallback
    });

    it('returns default if invalid', () => {
      expect(angkaSetelan(null, 1000)).toBe(1000);
      expect(angkaSetelan(undefined, 1000)).toBe(1000);
      expect(angkaSetelan('abc', 1000)).toBe(1000);
    });
  });

  describe('adFeeFrom', () => {
    it('returns poster ad fee', () => {
      expect(adFeeFrom(undefined, 'poster')).toBe(TARIF_BAWAAN.adPoster);
      expect(adFeeFrom({ adPoster: 12000 }, 'poster')).toBe(12000);
    });

    it('calculates tier-based fee for goods', () => {
      // < 50k
      expect(adFeeFrom(undefined, 'barang', 30000)).toBe(2000);
      // < 100k
      expect(adFeeFrom(undefined, 'barang', 80000)).toBe(3000);
      // fallback if no matching tiers
      expect(adFeeFrom({ adTiers: [] }, 'barang', 30000)).toBe(TARIF_BAWAAN.adBarang);
    });
    
    it('handles percentage tiers', () => {
      const customTiers = [{ upto: null, pct: 2 }];
      expect(adFeeFrom({ adTiers: customTiers }, 'barang', 100000)).toBe(2000);
    });
  });

  describe('soldFeeFrom', () => {
    it('returns 0 for items below 50k', () => {
      expect(soldFeeFrom(undefined, 40000)).toBe(0);
    });

    it('calculates 10% for items between 50k and 100k', () => {
      expect(soldFeeFrom(undefined, 80000)).toBe(8000);
    });

    it('calculates 5% for items above 100k', () => {
      expect(soldFeeFrom(undefined, 200000)).toBe(10000);
    });
  });

  describe('featuredRateFrom', () => {
    it('returns default if undefined', () => {
      expect(featuredRateFrom(undefined, undefined)).toBe(TARIF_BAWAAN.featuredPerDay);
    });

    it('clamps rate to min/max', () => {
      expect(featuredRateFrom({ featuredPerDay: 5000, featuredMaxPerDay: 10000 }, 2000)).toBe(5000); // clamped to min
      expect(featuredRateFrom({ featuredPerDay: 5000, featuredMaxPerDay: 10000 }, 15000)).toBe(10000); // clamped to max
      expect(featuredRateFrom({ featuredPerDay: 5000, featuredMaxPerDay: 10000 }, 7000)).toBe(7000); // inside range
    });
  });

  describe('rupiah', () => {
    it('formats numbers to Rupiah string', () => {
      expect(rupiah(15000)).toBe('Rp 15.000');
      expect(rupiah(0)).toBe('Rp 0');
      expect(rupiah('15000')).toBe('Rp 15.000'); // coerces string to number
      expect(rupiah(null)).toBe('Rp 0');
    });
  });
});
