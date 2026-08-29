import { describe, it, expect } from 'vitest';
import { formatWa, formatWaForBaileys, adalahIdSintetis } from '../src/lib/constants';

describe('formatWa', () => {
  it('normalises every accepted shape to 08xxx', () => {
    expect(formatWa('6289621213943')).toBe('089621213943');
    expect(formatWa('089621213943')).toBe('089621213943');
    expect(formatWa('89621213943')).toBe('089621213943');
    expect(formatWa('+62 896-2121-3943')).toBe('089621213943');
  });

  // Regresi 26 Agustus 2026: penjaga id sintetis memeriksa string UTUH, jadi
  // sufiks "@s.whatsapp.net" yang memang berhuruf membuat SETIAP JID ditolak.
  // Pemanggil yang punya cadangan `jid.split("@")[0]` lalu menulis digit mentah
  // berformat 62 ke basis data yang seluruhnya memakai 08 — satu orang jadi dua
  // kunci. Terbukti di produksi 28 Agustus 2026 di wa_conversations.
  it('accepts WhatsApp JIDs, whose suffix is letters by design', () => {
    expect(formatWa('6289621213943@s.whatsapp.net')).toBe('089621213943');
    expect(formatWa('6289621213943@c.us')).toBe('089621213943');
    expect(formatWa('089621213943@s.whatsapp.net')).toBe('089621213943');
  });

  it('still rejects synthetic identifiers, JID-suffixed or not', () => {
    expect(formatWa('email_0812345_1234')).toBe('');
    expect(formatWa('email_081234567_9012')).toBe('');
    expect(formatWa('google_0812345678_ab12x')).toBe('');
    expect(formatWa('email_0812345_1234@s.whatsapp.net')).toBe('');
    expect(adalahIdSintetis('email_0812345_1234')).toBe(true);
  });

  it('rejects @lid identities, which carry no phone number at all', () => {
    expect(formatWa('1234567890@lid')).toBe('');
    expect(formatWa('123456789012345@lid')).toBe('');
  });

  it('rejects lengths outside 10–13 digits and empty input', () => {
    expect(formatWa('')).toBe('');
    expect(formatWa(null)).toBe('');
    expect(formatWa('0812')).toBe('');
    expect(formatWa('08123456789012345')).toBe('');
  });

  it('formatWaForBaileys round-trips a JID back to 628xxx', () => {
    expect(formatWaForBaileys('6289621213943@s.whatsapp.net')).toBe('6289621213943');
    expect(formatWaForBaileys('089621213943')).toBe('6289621213943');
    expect(formatWaForBaileys('email_0812345_1234')).toBe('');
  });
});
