export interface BarisArmada {
  id: string;
  name: string;
  plateNumber: string;
  capacity: number;
  isActive: boolean;
  driverId: string | null;
}

export interface BarisHalte {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
}

export interface BarisAkun {
  email: string;
  fullName: string;
  password: string;
  accountType: 'user' | 'driver';
  active: boolean;
  occupancy: 'low' | 'medium' | 'full';
}

export interface ValidasiBaris<T> {
  index: number;
  value: T | null;
  errors: string[];
}

export type SumberDataTransfer = 'armada' | 'halte' | 'akun';

function selIsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function selNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

export function selBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'ya', 'yes', 'aktif', 'active'].includes(normalized)) return true;
    if (['false', '0', 'tidak', 'no', 'nonaktif', 'inactive'].includes(normalized)) return false;
  }
  return fallback;
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => cell.trim().length > 0));
}

export function csvEscaped(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>
): string {
  return [headers, ...rows]
    .map((row) => row.map(csvEscaped).join(','))
    .join('\r\n');
}

export function parseCsvObjects(csv: string): Array<Record<string, string>> {
  const [headerRow, ...rows] = parseCsv(csv);
  if (!headerRow) return [];
  const headers = headerRow.map((header) => header.trim());
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
  );
}

export function validateArmadaRow(
  value: unknown,
  index = 0
): ValidasiBaris<BarisArmada> {
  const errors: string[] = [];
  const input = selIsRecord(value) ? value : {};
  const id = selText(input.id).toUpperCase();
  const name = selText(input.name);
  const plateNumber = selText(input.plateNumber);
  const capacity = selNumber(input.capacity);
  const driverId = selText(input.driverId) || null;

  if (!/^LINUS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id)) {
    errors.push('ID armada harus berformat LINUS-XX.');
  }
  if (name.length < 2 || name.length > 80) {
    errors.push('Nama armada harus berisi 2–80 karakter.');
  }
  if (plateNumber.length > 24) {
    errors.push('Nomor kendaraan maksimal 24 karakter.');
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
    errors.push('Kapasitas harus berupa bilangan bulat 1–100.');
  }
  if (
    driverId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      driverId
    )
  ) {
    errors.push('ID driver tidak valid.');
  }

  return {
    index,
    errors,
    value: errors.length
      ? null
      : {
          id,
          name,
          plateNumber,
          capacity,
          isActive: selBoolean(input.isActive, true),
          driverId,
        },
  };
}

export function validateHalteRow(
  value: unknown,
  index = 0
): ValidasiBaris<BarisHalte> {
  const errors: string[] = [];
  const input = selIsRecord(value) ? value : {};
  const id = selText(input.id).toLowerCase();
  const name = selText(input.name);
  const area = selText(input.area);
  const lat = selNumber(input.lat);
  const lng = selNumber(input.lng);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    errors.push('ID halte hanya boleh huruf kecil, angka, dan tanda hubung.');
  }
  if (name.length < 2 || name.length > 100) {
    errors.push('Nama halte harus berisi 2–100 karakter.');
  }
  if (area.length < 2 || area.length > 120) {
    errors.push('Area halte harus berisi 2–120 karakter.');
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push('Latitude tidak valid.');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push('Longitude tidak valid.');
  }

  return {
    index,
    errors,
    value: errors.length ? null : { id, name, area, lat, lng },
  };
}

export function validateAkunRow(
  value: unknown,
  index = 0
): ValidasiBaris<BarisAkun> {
  const errors: string[] = [];
  const input = selIsRecord(value) ? value : {};
  const email = selText(input.email).toLowerCase();
  const fullName = selText(input.fullName);
  const password = typeof input.password === 'string' ? input.password : '';
  const rawType = selText(input.accountType).toLowerCase();
  const rawOccupancy = selText(input.occupancy).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email akun tidak valid.');
  }
  if (fullName.length < 2 || fullName.length > 100) {
    errors.push('Nama lengkap harus berisi 2–100 karakter.');
  }
  if (password && password.length < 8) {
    errors.push('Password minimal 8 karakter.');
  }
  if (rawType !== 'user' && rawType !== 'driver') {
    errors.push('Jenis akun harus user atau driver.');
  }
  if (!['low', 'medium', 'full'].includes(rawOccupancy)) {
    errors.push('Kepadatan harus low, medium, atau full.');
  }

  return {
    index,
    errors,
    value: errors.length
      ? null
      : {
          email,
          fullName,
          password,
          accountType: rawType as 'user' | 'driver',
          active: selBoolean(input.active, true),
          occupancy: rawOccupancy as 'low' | 'medium' | 'full',
        },
  };
}

export function parseArmadaCsv(csv: string): ValidasiBaris<BarisArmada>[] {
  return parseCsvObjects(csv).map((row, index) => validateArmadaRow(row, index));
}

export function parseHalteCsv(csv: string): ValidasiBaris<BarisHalte>[] {
  return parseCsvObjects(csv).map((row, index) => validateHalteRow(row, index));
}

export function parseAkunCsv(csv: string): ValidasiBaris<BarisAkun>[] {
  return parseCsvObjects(csv).map((row, index) => validateAkunRow(row, index));
}

export function templateCsv(source: SumberDataTransfer): string {
  if (source === 'armada') {
    return serializeCsv(
      ['id', 'name', 'plateNumber', 'capacity', 'isActive', 'driverId'],
      [['LINUS-04', 'Linus 04 — Rute Kampus', 'BK 7004 USU', 30, 'true', '']]
    );
  }
  if (source === 'halte') {
    return serializeCsv(
      ['id', 'name', 'area', 'lat', 'lng'],
      [['halte-contoh', 'Halte Contoh', 'Jl. Universitas', '3.5630', '98.6556']]
    );
  }
  return serializeCsv(
    ['email', 'fullName', 'password', 'accountType', 'active', 'occupancy'],
    [['driver@example.com', 'Nama Driver', 'password123', 'driver', 'true', 'medium']]
  );
}

export function chunkRows<T>(rows: readonly T[], size = 50): T[][] {
  const normalizedSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += normalizedSize) {
    chunks.push(rows.slice(index, index + normalizedSize));
  }
  return chunks;
}
