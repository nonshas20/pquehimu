/**
 * HIMU Cryptographic Security Utility
 * Enterprise-grade PBKDF2-HMAC-SHA256 password hashing & verification
 * Powered by standard W3C Web Crypto API (SubtleCrypto)
 */

const PBKDF2_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH_BITS = 256;

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Helper to obtain Web Crypto across browser and global contexts
function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  throw new Error('Web Crypto API is unavailable in this environment');
}

/**
 * Hash a plain-text password using PBKDF2-HMAC-SHA256 with a unique cryptographic salt.
 * Output format: pbkdf2:<iterations>:<hexSalt>:<hexHash>
 */
export async function hashPassword(password: string): Promise<string> {
  const cryptoInstance = getCrypto();
  const enc = new TextEncoder();
  const salt = cryptoInstance.getRandomValues(new Uint8Array(16));

  const keyMaterial = await cryptoInstance.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoInstance.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  const hashBytes = new Uint8Array(derivedBits);
  const saltHex = bytesToHex(salt);
  const hashHex = bytesToHex(hashBytes);

  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verify a plain-text candidate password against a stored PBKDF2 hash
 * (with constant-time comparison to prevent timing side-channel attacks).
 * Also gracefully handles legacy plaintext passwords during migration.
 */
export async function verifyPassword(
  candidate: string,
  stored: string | undefined | null
): Promise<boolean> {
  if (!candidate || !stored) return false;

  // 1. Check if stored is PBKDF2 formatted
  if (stored.startsWith('pbkdf2:')) {
    const parts = stored.split(':');
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHashHex = parts[3];

    if (isNaN(iterations) || !saltHex || !expectedHashHex) return false;

    try {
      const cryptoInstance = getCrypto();
      const enc = new TextEncoder();
      const salt = hexToBytes(saltHex);

      const keyMaterial = await cryptoInstance.subtle.importKey(
        'raw',
        enc.encode(candidate),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await cryptoInstance.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt as any,
          iterations,
          hash: HASH_ALGORITHM,
        },
        keyMaterial,
        KEY_LENGTH_BITS
      );

      const derivedHex = bytesToHex(new Uint8Array(derivedBits));

      // Constant-time string comparison
      if (derivedHex.length !== expectedHashHex.length) return false;
      let diff = 0;
      for (let i = 0; i < derivedHex.length; i++) {
        diff |= derivedHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
      }
      return diff === 0;
    } catch (err) {
      console.error('[Security] Error verifying PBKDF2 hash:', err);
      return false;
    }
  }

  // 2. Fallback for legacy initial plaintext seed (e.g. initial 'password123')
  return candidate === stored;
}

/**
 * Checks if a stored password string is already cryptographically hashed
 */
export function isPasswordHashed(passwordStr?: string | null): boolean {
  return Boolean(passwordStr && passwordStr.startsWith('pbkdf2:'));
}

/**
 * Strips password property from user object to prevent storing in localStorage
 */
export function sanitizeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const copy = { ...user };
  delete copy.password;
  return copy;
}
