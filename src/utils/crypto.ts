import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-gcm';

const getKey = (): Buffer => {
  const secret = config.FIELD_ENCRYPTION_KEY || config.JWT_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
};

export const encryptString = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
};

export const decryptString = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  const parts = value.split('.');
  if (parts.length !== 3) {
    return value;
  }

  const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};
