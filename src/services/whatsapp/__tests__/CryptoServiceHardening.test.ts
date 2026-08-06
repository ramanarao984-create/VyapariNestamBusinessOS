import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CryptoService } from '../CryptoService';

describe('CryptoService Hardening & AES-256-GCM Vault', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should encrypt plain text with v1: version prefix using AES-256-GCM', () => {
    process.env.ENCRYPTION_SECRET = 'test_secret_key_that_is_32_bytes_long!!';
    const plain = 'EAAG1234567890SecretTokenValue';
    const encrypted = CryptoService.encrypt(plain);

    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted.split(':').length).toBe(4); // v1:iv:authTag:ciphertext
  });

  it('should correctly decrypt v1: versioned ciphertexts', () => {
    process.env.ENCRYPTION_SECRET = 'test_secret_key_that_is_32_bytes_long!!';
    const plain = 'EAAG_Meta_Access_Token_Value_98765';
    const encrypted = CryptoService.encrypt(plain);
    const decrypted = CryptoService.decrypt(encrypted);

    expect(decrypted).toBe(plain);
  });

  it('should support zero-downtime backward compatibility for unversioned ciphertexts', () => {
    process.env.ENCRYPTION_SECRET = 'test_secret_key_that_is_32_bytes_long!!';
    const plain = 'Legacy_Plain_Token_Text';
    // Unversioned legacy fallback
    const decrypted = CryptoService.decrypt(plain);

    expect(decrypted).toBe(plain);
  });

  it('should prevent double encryption', () => {
    process.env.ENCRYPTION_SECRET = 'test_secret_key_that_is_32_bytes_long!!';
    const plain = 'SampleToken123';
    const encryptedOnce = CryptoService.encrypt(plain);
    const encryptedTwice = CryptoService.encrypt(encryptedOnce);

    expect(encryptedTwice).toBe(encryptedOnce);
  });

  it('should fail closed in production if ENCRYPTION_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENCRYPTION_SECRET;

    expect(() => {
      CryptoService.encrypt('TestToken');
    }).toThrow(/ENCRYPTION_SECRET environment variable is not configured in production/);
  });

  it('should correctly mask access tokens for UI display', () => {
    const token = 'EAAG12345678901234567890XYZ';
    const masked = CryptoService.maskToken(token);

    expect(masked.startsWith('EAAG')).toBe(true);
    expect(masked.endsWith('0XYZ')).toBe(true);
    expect(masked.includes('••••••••')).toBe(true);
    expect(masked.includes('1234567890123456')).toBe(false);
  });
});
