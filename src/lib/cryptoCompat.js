/**
 * Crypto compatibility layer for Cloudflare Workers / Pages
 * Uses the Web Crypto API instead of Node.js builtin crypto where possible.
 */

export function createHash(algorithm) {
  if (algorithm !== "sha256") throw new Error("Only sha256 is supported in cryptoCompat");

  let data = Buffer.alloc(0);
  return {
    update(chunk) {
      const b = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      data = Buffer.concat([data, b]);
      return this;
    },
    digest(encoding) {
      // Note: This is a simplified fallback. For real production,
      // Cloudflare should use crypto.subtle.digest()
      // But for simple hash generation, we can use a library or just this for now.
      // We will need to install a small crypto-js or similar if this isn't enough.
      throw new Error("createHash.digest not fully implemented for Edge yet - use Web Crypto API directly");
    }
  };
}

export function createHmac(algorithm, key) {
  // Logic for HMAC using Web Crypto
  throw new Error("createHmac not fully implemented for Edge yet - use Web Crypto API directly");
}

export function createCipheriv(algorithm, key, iv) {
  throw new Error("createCipheriv not fully implemented for Edge yet - use Web Crypto API directly");
}

export function createDecipheriv(algorithm, key, iv) {
  throw new Error("createDecipheriv not fully implemented for Edge yet - use Web Crypto API directly");
}
