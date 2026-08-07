/** 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.unmock('../client');

import { getSupabaseClient } from '../client';

describe('Supabase Client (Lazy Initialization & Connection)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw a detailed descriptive error if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing during client resolve', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseClient()).toThrow(/Missing Supabase environment variables/);
  });

  it('should correctly initialize and return the SupabaseClient instance when environment variables are supplied', () => {
    process.env.SUPABASE_URL = 'https://mock-instance-1234.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-secret-service-role-key-123';

    const client = getSupabaseClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
