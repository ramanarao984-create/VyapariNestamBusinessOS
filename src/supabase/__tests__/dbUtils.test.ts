/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkDatabaseConnection } from '../dbUtils';
import { getSupabaseClient } from '../client';

// Mock the client module to allow custom behavior injection
vi.mock('../client', () => {
  const mockFrom = vi.fn();
  const mockClient = {
    from: mockFrom,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  };
  return {
    getSupabaseClient: vi.fn(() => mockClient),
  };
});

describe('Supabase Database Verification (dbUtils)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = getSupabaseClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return success true when the tenants table exists and can be queried successfully', async () => {
    // Arrange: Mock select chain resolving to empty data successfully
    const mockSelect = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    // Act
    const status = await checkDatabaseConnection();

    // Assert
    expect(status.success).toBe(true);
    expect(status.message).toContain('verified successfully');
    expect(mockSupabase.from).toHaveBeenCalledWith('tenants');
  });

  it('should return success true with a descriptive note when table does not exist yet (Error Code 42P01)', async () => {
    // Arrange: Mock select chain resolving to error code '42P01' (relation does not exist)
    const mockSelect = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation "tenants" does not exist' }
      })
    });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    // Act
    const status = await checkDatabaseConnection();

    // Assert
    expect(status.success).toBe(true);
    expect(status.message).toContain('Database schema is not yet applied');
  });

  it('should return success false and log error when connection fails due to invalid credentials or general database issues', async () => {
    // Arrange: Mock select chain resolving to a general connection/permission error
    const mockSelect = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'JWTS expired or invalid signature' }
      })
    });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    const status = await checkDatabaseConnection();

    // Assert
    expect(status.success).toBe(false);
    expect(status.message).toContain('JWTS expired or invalid signature');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
