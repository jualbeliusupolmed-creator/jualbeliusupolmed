const encoder = new TextEncoder();
const decoder = new TextDecoder();

function subtleCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable.");
  }
  return globalThis.crypto.subtle;
}

function asBytes(value) {
  if (typeof value === "string") return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError("Expected a string or byte array.");
}

export function encodeUtf8(value) {
  return encoder.encode(String(value));
}

export function decodeUtf8(value) {
  return decoder.decode(asBytes(value));
}

export function bytesToHex(value) {
  return Array.from(asBytes(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(value) {
  if (typeof value !== "string" || value.length % 2 !== 0 || !/^[\da-f]*$/i.test(value)) {
    throw new Error("Invalid hexadecimal value.");
  }
  return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => Number.parseInt(byte, 16));
}

export function randomHex(length) {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new RangeError("Hex length must be a positive integer.");
  }
  const bytes = new Uint8Array(Math.ceil(length / 2));
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random values are unavailable.");
  }
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes).slice(0, length);
}

export function bytesToBase64Url(value) {
  const bytes = asBytes(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value) {
  if (typeof value !== "string" || !/^[\da-z_-]+$/i.test(value)) {
    throw new Error("Invalid base64url value.");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256(value) {
  return new Uint8Array(await subtleCrypto().digest("SHA-256", asBytes(value)));
}

async function hmacKey(key) {
  return subtleCrypto().importKey("raw", asBytes(key), {
    name: "HMAC",
    hash: "SHA-256",
  }, false, ["sign", "verify"]);
}

export async function hmacSha256(key, value) {
  const importedKey = await hmacKey(key);
  return new Uint8Array(await subtleCrypto().sign("HMAC", importedKey, asBytes(value)));
}

export async function verifyHmacSha256(key, value, signature) {
  const importedKey = await hmacKey(key);
  return subtleCrypto().verify("HMAC", importedKey, asBytes(signature), asBytes(value));
}

async function aesGcmKey(key) {
  const rawKey = asBytes(key);
  if (rawKey.length !== 32) throw new Error("AES-256-GCM requires a 256-bit key.");
  return subtleCrypto().importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function aes256GcmEncrypt(key, iv, plaintext) {
  const importedKey = await aesGcmKey(key);
  const encrypted = new Uint8Array(await subtleCrypto().encrypt({
    name: "AES-GCM",
    iv: asBytes(iv),
    tagLength: 128,
  }, importedKey, asBytes(plaintext)));
  return {
    ciphertext: encrypted.subarray(0, encrypted.length - 16),
    authTag: encrypted.subarray(encrypted.length - 16),
  };
}

export async function aes256GcmDecrypt(key, iv, ciphertext, authTag) {
  const tag = asBytes(authTag);
  if (tag.length !== 16) throw new Error("Invalid AES-GCM authentication tag.");
  const encrypted = new Uint8Array(asBytes(ciphertext).length + tag.length);
  encrypted.set(asBytes(ciphertext));
  encrypted.set(tag, encrypted.length - tag.length);
  const importedKey = await aesGcmKey(key);
  const plaintext = await subtleCrypto().decrypt({
    name: "AES-GCM",
    iv: asBytes(iv),
    tagLength: 128,
  }, importedKey, encrypted);
  return new Uint8Array(plaintext);
}
