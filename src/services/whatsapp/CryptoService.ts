/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

/**
 * Server-side AES-256-GCM Authenticated Encryption Vault
 * Supports key version metadata (`v1:`), production fail-closed security,
 * and zero-downtime backward compatibility for existing ciphertexts.
 */
export class CryptoService {
  private static CURRENT_VERSION = 'v1';

  /**
   * Securely resolves master 256-bit encryption key.
   * Fails closed in production if ENCRYPTION_SECRET is missing or invalid.
   */
  private static getMasterKey(): Buffer {
    const isProd = process.env.NODE_ENV === 'production';
    const secret = process.env.ENCRYPTION_SECRET;

    if (secret) {
      if (secret.length >= 32) {
        return crypto.createHash('sha256').update(secret).digest();
      }
      try {
        const decoded = Buffer.from(secret, 'base64');
        if (decoded.length === 32) {
          return decoded;
        }
      } catch {
        // Fall through
      }
      return crypto.createHash('sha256').update(secret).digest();
    }

    if (isProd) {
      throw new Error(
        'FATAL [CryptoService]: ENCRYPTION_SECRET environment variable is not configured in production. Failing closed to protect credentials.'
      );
    }

    // Isolated, deterministic non-production key fallback
    const devFallback = process.env.SUPABASE_SERVICE_ROLE_KEY || 'nestam_crm_dev_master_encryption_fallback_secret_32_bytes!';
    return crypto.createHash('sha256').update(devFallback).digest();
  }

  /**
   * Encrypts plain text using AES-256-GCM.
   * Returns versioned ciphertext in format `v1:ivHex:authTagHex:encryptedHex`
   */
  public static encrypt(plainText: string): string {
    if (!plainText || !plainText.trim()) {
      throw new Error('[CryptoService] Cannot encrypt empty token string.');
    }

    // Prevent accidental double-encryption
    if (plainText.startsWith('v1:')) {
      return plainText;
    }

    const key = this.getMasterKey();
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${this.CURRENT_VERSION}:${ivHex}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext back to plain text.
   * Handles `v1:ivHex:authTagHex:encryptedHex` as well as legacy `ivHex:authTagHex:encryptedHex`
   */
  public static decrypt(cipherText: string): string {
    if (!cipherText || !cipherText.trim()) {
      throw new Error('[CryptoService] Cannot decrypt empty ciphertext.');
    }

    let version = 'v0';
    let parts: string[];

    if (cipherText.startsWith('v1:')) {
      version = 'v1';
      parts = cipherText.substring(3).split(':');
    } else if (cipherText.includes(':')) {
      parts = cipherText.split(':');
    } else {
      // Legacy unencrypted plaintext fallback for seamless migration
      return cipherText;
    }

    if (parts.length !== 3) {
      throw new Error('[CryptoService] Invalid ciphertext structure.');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = this.getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err: any) {
      throw new Error(`[CryptoService] Decryption failed or ciphertext tampered: ${err.message}`);
    }
  }

  /**
   * Masks access tokens for safe UI and diagnostic displays (e.g. "EAAG...3a8f")
   */
  public static maskToken(token: string): string {
    if (!token || token.length < 10) return '••••••••';
    return `${token.substring(0, 4)}••••••••${token.substring(token.length - 4)}`;
  }
}
