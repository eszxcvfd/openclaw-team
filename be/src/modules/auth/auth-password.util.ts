import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SCRYPT_KEY_LENGTH = 64;

export async function hashPassword(password: string, salt?: string) {
  const resolvedSalt = salt ?? randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(
    password,
    resolvedSalt,
    SCRYPT_KEY_LENGTH,
  )) as Buffer;

  return `scrypt$${resolvedSalt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [algorithm, salt, hash] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  const expectedHash = Buffer.from(hash, 'hex');

  if (derivedKey.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedHash);
}
