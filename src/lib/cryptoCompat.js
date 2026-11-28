import {
  createCipheriv as nodeCreateCipheriv,
  createDecipheriv as nodeCreateDecipheriv,
  createHash as nodeCreateHash,
  createHmac as nodeCreateHmac,
} from "node:crypto";

export function createHash(algorithm) {
  if (algorithm !== "sha256") throw new Error("Only sha256 is supported in cryptoCompat");
  return nodeCreateHash(algorithm);
}

export function createHmac(algorithm, key) {
  if (algorithm !== "sha256") throw new Error("Only sha256 is supported in cryptoCompat");
  return nodeCreateHmac(algorithm, key);
}

export function createCipheriv(algorithm, key, iv) {
  if (algorithm !== "aes-256-gcm") {
    throw new Error("Only aes-256-gcm is supported in cryptoCompat");
  }
  return nodeCreateCipheriv(algorithm, key, iv);
}

export function createDecipheriv(algorithm, key, iv) {
  if (algorithm !== "aes-256-gcm") {
    throw new Error("Only aes-256-gcm is supported in cryptoCompat");
  }
  return nodeCreateDecipheriv(algorithm, key, iv);
}
