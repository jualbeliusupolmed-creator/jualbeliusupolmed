(() => {
  'use strict';

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const decoder = new TextDecoder('utf-8');

  function xmlDocument(text) {
    const document = new DOMParser().parseFromString(text, 'application/xml');
    if (document.getElementsByTagName('parsererror').length) throw new Error('Isi XML di dalam file Excel tidak dapat dibaca.');
    return document;
  }

  function elements(node, localName) {
    return Array.from(node.getElementsByTagNameNS('*', localName));
  }

  function columnIndex(reference) {
    const letters = String(reference || '').match(/^[A-Z]+/i)?.[0]?.toUpperCase();
    if (!letters) return -1;
    let result = 0;
    for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
    return result - 1;
  }

  function columnLetters(index) {
    let value = index + 1;
    let label = '';
    while (value > 0) {
      value -= 1;
      label = String.fromCharCode(65 + value % 26) + label;
      value = Math.floor(value / 26);
    }
    return label;
  }

  function normalizeArchivePath(base, target) {
    const parts = target.startsWith('/') ? [] : base.split('/').slice(0, -1);
    for (const part of target.replace(/^\//, '').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return parts.join('/');
  }

  async function archiveEntries(buffer) {
    const view = new DataView(buffer);
    const floor = Math.max(0, view.byteLength - 65_557);
    let end = -1;
    for (let offset = view.byteLength - 22; offset >= floor; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) { end = offset; break; }
    }
    if (end < 0) throw new Error('File ini bukan workbook XLSX yang valid.');
    const count = view.getUint16(end + 10, true);
    const centralOffset = view.getUint32(end + 16, true);
    if (count === 0xffff || centralOffset === 0xffffffff) throw new Error('Workbook ZIP64 belum didukung.');

    const entries = new Map();
    let offset = centralOffset;
    for (let index = 0; index < count; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Daftar isi workbook rusak.');
      const flags = view.getUint16(offset + 8, true);
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
      if ((flags & 1) !== 0) throw new Error('File Excel terenkripsi. Simpan salinan tanpa kata sandi lalu coba lagi.');
      entries.set(name, { method, compressedSize, uncompressedSize, localOffset });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return { view, entries };
  }

  async function readArchiveFile(buffer, archive, name) {
    const entry = archive.entries.get(name);
    if (!entry) return null;
    if (entry.uncompressedSize > 32 * 1024 * 1024) throw new Error('Salah satu bagian file terlalu besar untuk diproses.');
    const { view } = archive;
    const local = entry.localOffset;
    if (view.getUint32(local, true) !== 0x04034b50) throw new Error('Isi workbook rusak.');
    const nameLength = view.getUint16(local + 26, true);
    const extraLength = view.getUint16(local + 28, true);
    const start = local + 30 + nameLength + extraLength;
    const bytes = new Uint8Array(buffer, start, entry.compressedSize);
    if (entry.method === 0) return bytes;
    if (entry.method !== 8 || typeof DecompressionStream === 'undefined') {
      throw new Error('Browser belum mendukung pembacaan XLSX ini. Coba Chrome, Edge, atau Safari versi terbaru.');
    }
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      throw new Error('Bagian terkompresi di file Excel tidak dapat dibuka.');
    }
  }

  function textFromElements(parent, tagName) {
    return elements(parent, tagName).map((item) => item.textContent || '').join('');
  }

  async function readRows(file) {
    if (!file || !/\.xlsx$/i.test(file.name)) throw new Error('Pilih file Excel berformat .xlsx.');
    if (file.size > MAX_FILE_BYTES) throw new Error('Ukuran file maksimal 20 MB.');
    const buffer = await file.arrayBuffer();
    const archive = await archiveEntries(buffer);
    const workbookBytes = await readArchiveFile(buffer, archive, 'xl/workbook.xml');
    const relsBytes = await readArchiveFile(buffer, archive, 'xl/_rels/workbook.xml.rels');
    if (!workbookBytes || !relsBytes) throw new Error('File tidak berisi workbook Excel yang dapat dibaca.');
    const workbook = xmlDocument(decoder.decode(workbookBytes));
    const relations = xmlDocument(decoder.decode(relsBytes));
    const firstSheet = elements(workbook, 'sheet')[0];
    if (!firstSheet) throw new Error('Workbook tidak memiliki lembar kerja.');
    const relationId = Array.from(firstSheet.attributes).find((attribute) => attribute.localName === 'id')?.value;
    const relation = elements(relations, 'Relationship').find((item) => item.getAttribute('Id') === relationId);
    const target = relation?.getAttribute('Target');
    if (!target || relation?.getAttribute('TargetMode') === 'External') throw new Error('Lembar kerja pertama tidak dapat ditemukan.');
    const sheetPath = normalizeArchivePath('xl/workbook.xml', target);
    const sheetBytes = await readArchiveFile(buffer, archive, sheetPath);
    if (!sheetBytes) throw new Error('Isi lembar kerja pertama tidak ditemukan.');

    const sharedBytes = await readArchiveFile(buffer, archive, 'xl/sharedStrings.xml');
    const sharedStrings = sharedBytes
      ? elements(xmlDocument(decoder.decode(sharedBytes)), 'si').map((item) => textFromElements(item, 't'))
      : [];
    const sheet = xmlDocument(decoder.decode(sheetBytes));
    const sheetData = elements(sheet, 'sheetData')[0];
    if (!sheetData) throw new Error('Lembar kerja pertama kosong.');

    const rows = elements(sheetData, 'row').map((rowNode) => {
      const row = [];
      for (const cell of elements(rowNode, 'c')) {
        const index = columnIndex(cell.getAttribute('r'));
        if (index < 0) continue;
        const type = cell.getAttribute('t');
        let value = '';
        if (type === 'inlineStr') value = textFromElements(cell, 't');
        else {
          const raw = elements(cell, 'v')[0]?.textContent || '';
          value = type === 's' ? (sharedStrings[Number(raw)] ?? '') : raw;
        }
        row[index] = value;
      }
      return row;
    });
    const headers = rows[0] || [];
    return { sheetName: firstSheet.getAttribute('name') || 'Lembar 1', rows, headers };
  }

  function detectPhoneColumn(headers) {
    const likelyNames = ['nowa', 'nomorwa', 'nomorwhatsapp', 'whatsapp', 'nohp', 'nomorhp', 'telepon', 'phone', 'phonenumber', 'mobile'];
    const normalized = (value) => String(value ?? '').toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    return headers.findIndex((value) => {
      const name = normalized(value);
      return likelyNames.includes(name) || name.includes('nomorwa') || name.includes('nomorwhatsapp') || name.includes('phonenumber');
    });
  }

  function normalizePhone(value) {
    let source = String(value ?? '').trim();
    if (!source) return '';
    if (/^\d+(?:\.0+)?$/.test(source)) source = source.replace(/\.0+$/, '');
    if (/^\d+(?:\.\d+)?e[+-]?\d+$/i.test(source)) {
      const expanded = Number(source);
      if (!Number.isSafeInteger(expanded)) return '';
      source = String(expanded);
    }
    let digits = source.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    else if (digits.startsWith('8')) digits = `62${digits}`;
    return digits.length >= 10 && digits.length <= 15 ? digits : '';
  }

  function extractPhones(rows, column, skipHeader) {
    const start = skipHeader ? 1 : 0;
    const numbers = [];
    const seen = new Set();
    let invalid = 0;
    let duplicate = 0;
    for (const row of rows.slice(start)) {
      const raw = row?.[column];
      if (raw === undefined || raw === null || String(raw).trim() === '') continue;
      const phone = normalizePhone(raw);
      if (!phone) { invalid += 1; continue; }
      if (seen.has(phone)) { duplicate += 1; continue; }
      seen.add(phone);
      numbers.push(phone);
    }
    return { numbers, invalid, duplicate };
  }

  window.JBPhoneXlsx = { readRows, detectPhoneColumn, extractPhones, normalizePhone, columnLetters };
})();
