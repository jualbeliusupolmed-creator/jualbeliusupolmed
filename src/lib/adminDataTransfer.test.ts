import { describe, expect, it } from 'vitest';
import {
  chunkRows,
  parseAkunCsv,
  parseArmadaCsv,
  parseCsv,
  parseCsvObjects,
  parseHalteCsv,
  serializeCsv,
  templateCsv,
  validateAkunRow,
  validateArmadaRow,
  validateHalteRow,
} from './adminDataTransfer';

describe('adminDataTransfer', () => {
  it('parses quoted CSV cells and embedded separators', () => {
    const rows = parseCsv('id,name,note\r\nLINUS-01,"Linus, Utama","Halo "" dunia"""\r\n');

    expect(rows).toEqual([
      ['id', 'name', 'note'],
      ['LINUS-01', 'Linus, Utama', 'Halo " dunia"'],
    ]);
  });

  it('maps CSV headers to objects', () => {
    expect(parseCsvObjects('id,name\nLINUS-01,Linus')).toEqual([
      { id: 'LINUS-01', name: 'Linus' },
    ]);
  });

  it('serializes values that require CSV escaping', () => {
    expect(serializeCsv(['id', 'note'], [['LINUS-01', 'a,b"c']])).toBe(
      'id,note\r\nLINUS-01,"a,b""c"'
    );
  });

  it('validates and normalizes fleet rows', () => {
    const result = validateArmadaRow({
      id: 'linus-02',
      name: 'Linus 02',
      plateNumber: 'BK 2 USU',
      capacity: '30',
      isActive: 'false',
      driverId: '',
    });

    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({
      id: 'LINUS-02',
      name: 'Linus 02',
      plateNumber: 'BK 2 USU',
      capacity: 30,
      isActive: false,
      driverId: null,
    });
  });

  it('rejects invalid fleet rows', () => {
    const result = validateArmadaRow({
      id: 'bus-1',
      name: 'X',
      capacity: 0,
      driverId: 'invalid',
    });

    expect(result.value).toBeNull();
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('validates stop coordinates and identifiers', () => {
    expect(
      validateHalteRow({
        id: 'halte-utama',
        name: 'Halte Utama',
        area: 'Jl. Universitas',
        lat: '3.563',
        lng: '98.6556',
      }).value
    ).toEqual({
      id: 'halte-utama',
      name: 'Halte Utama',
      area: 'Jl. Universitas',
      lat: 3.563,
      lng: 98.6556,
    });
    expect(
      validateHalteRow({
        id: 'Halte Utama',
        name: 'Halte',
        area: 'Kampus',
        lat: 100,
        lng: 200,
      }).value
    ).toBeNull();
  });

  it('validates account type, occupancy, and optional password', () => {
    expect(
      validateAkunRow({
        email: 'USER@EXAMPLE.COM',
        fullName: 'Pengguna Linus',
        password: '',
        accountType: 'USER',
        active: 'true',
        occupancy: 'LOW',
      }).value
    ).toEqual({
      email: 'user@example.com',
      fullName: 'Pengguna Linus',
      password: '',
      accountType: 'user',
      active: true,
      occupancy: 'low',
    });
    expect(
      validateAkunRow({
        email: 'invalid',
        fullName: 'A',
        password: 'short',
        accountType: 'admin',
        occupancy: 'empty',
      }).value
    ).toBeNull();
  });

  it('parses fleet, stop, and account CSV sources', () => {
    expect(parseArmadaCsv(templateCsv('armada'))[0].value?.id).toBe('LINUS-04');
    expect(parseHalteCsv(templateCsv('halte'))[0].value?.id).toBe('halte-contoh');
    expect(parseAkunCsv(templateCsv('akun'))[0].value?.accountType).toBe('driver');
  });

  it('chunks rows with a safe positive size', () => {
    expect(chunkRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkRows([1, 2], 0)).toEqual([[1], [2]]);
  });
});
