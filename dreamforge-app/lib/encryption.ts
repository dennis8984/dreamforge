import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.CHAT_ENCRYPTION_KEY;
  if (!key) throw new Error('CHAT_ENCRYPTION_KEY not configured');
  return Buffer.from(key, 'base64');
}

export function generateDEK(): string {
  return crypto.randomBytes(32).toString('base64');
}

export function encryptMessage(plaintext: string, dekBase64: string): { ciphertext: string; iv: string; authTag: string } {
  const dek = Buffer.from(dekBase64, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  return { ciphertext: encrypted, iv: iv.toString('base64'), authTag };
}

export function decryptMessage(ciphertext: string, iv: string, authTag: string, dekBase64: string): string {
  const dek = Buffer.from(dekBase64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, dek, Buffer.from(iv, 'base64'), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function encryptDEK(dekBase64: string): { encryptedDek: string; iv: string; authTag: string } {
  const mek = getMasterKey();
  const result = encryptMessage(dekBase64, mek.toString('base64'));
  return { encryptedDek: result.ciphertext, iv: result.iv, authTag: result.authTag };
}

export function decryptDEK(encryptedDek: string, iv: string, authTag: string): string {
  const mek = getMasterKey();
  return decryptMessage(encryptedDek, iv, authTag, mek.toString('base64'));
}
