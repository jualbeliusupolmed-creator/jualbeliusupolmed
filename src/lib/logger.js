// Logger Terpusat & Aman sesuai pedoman AGENTS.md
// Melakukan redaksi otomatis terhadap nomor telepon, email, token rahasia, dan sandi

const SENSITIVE_KEY_REGEX = /(password|pin|secret|token|authorization|bearer|jwt|cookie|key)/i;
const PHONE_REGEX = /(\+?62|0)8[1-9][0-9]{6,11}/g;
const EMAIL_REGEX = /([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;

/**
 * Mask nomor telepon: 08123456789 -> 0812***789
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  return phone.replace(PHONE_REGEX, (match) => {
    if (match.length <= 6) return '***';
    const prefix = match.slice(0, 4);
    const suffix = match.slice(-3);
    return `${prefix}***${suffix}`;
  });
}

/**
 * Mask email: user@domain.com -> u***@domain.com
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  return email.replace(EMAIL_REGEX, (_, firstChar, domain) => `${firstChar}***@${domain}`);
}

/**
 * Sensor objek atau nilai sebelum dicetak ke log
 */
export function sanitizeLogData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return maskPhone(maskEmail(data));
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  if (data instanceof Error) {
    return {
      name: data.name,
      message: maskPhone(maskEmail(data.message)),
      stack: maskPhone(maskEmail(data.stack || '')),
    };
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }
  if (typeof data === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = sanitizeLogData(val);
      }
    }
    return clean;
  }
  return String(data);
}

export const logger = {
  info(message, context = null) {
    const time = new Date().toISOString();
    const sanitizedMsg = maskPhone(maskEmail(String(message)));
    if (context) {
      console.log(`[INFO ${time}] ${sanitizedMsg}`, sanitizeLogData(context));
    } else {
      console.log(`[INFO ${time}] ${sanitizedMsg}`);
    }
  },

  warn(message, context = null) {
    const time = new Date().toISOString();
    const sanitizedMsg = maskPhone(maskEmail(String(message)));
    if (context) {
      console.warn(`[WARN ${time}] ${sanitizedMsg}`, sanitizeLogData(context));
    } else {
      console.warn(`[WARN ${time}] ${sanitizedMsg}`);
    }
  },

  error(message, error = null, context = null) {
    const time = new Date().toISOString();
    const sanitizedMsg = maskPhone(maskEmail(String(message)));
    const payload = {
      ...(error ? { error: sanitizeLogData(error) } : {}),
      ...(context ? { context: sanitizeLogData(context) } : {}),
    };
    if (Object.keys(payload).length > 0) {
      console.error(`[ERROR ${time}] ${sanitizedMsg}`, payload);
    } else {
      console.error(`[ERROR ${time}] ${sanitizedMsg}`);
    }
  },
};
