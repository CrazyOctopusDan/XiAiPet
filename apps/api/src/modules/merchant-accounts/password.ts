import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PASSWORD_PREFIX = 'scrypt';

export async function hashMerchantPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('base64url');
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${PASSWORD_PREFIX}$${salt}$${derived.toString('base64url')}`;
}

export async function verifyMerchantPassword(password: string, hash: string): Promise<boolean> {
  const [prefix, salt, expected] = hash.split('$');
  if (prefix !== PASSWORD_PREFIX || !salt || !expected) {
    return false;
  }

  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const expectedBuffer = Buffer.from(expected, 'base64url');
  return derived.length === expectedBuffer.length && crypto.timingSafeEqual(derived, expectedBuffer);
}
