import {describe, expect, it} from 'vitest';
import {extractCronSecret, isAuthorizedCronRequest, timingSafeSecretCompare} from './cronAuth';

describe('cronAuth', () => {
  it('extracts Vercel Bearer cron secrets', () => {
    expect(
      extractCronSecret({
        headers: {authorization: 'Bearer production-secret'},
      }),
    ).toBe('production-secret');
  });

  it('keeps legacy manual cron secret fallbacks for operators', () => {
    expect(extractCronSecret({headers: {'x-cron-secret': 'header-secret'}})).toBe('header-secret');
    expect(extractCronSecret({headers: {}, query: {secret: 'query-secret'}})).toBe('query-secret');
  });

  it('authorizes only exact cron secret matches', () => {
    const expected = 'expected-secret';

    expect(isAuthorizedCronRequest({headers: {authorization: `Bearer ${expected}`}}, expected)).toBe(true);
    expect(isAuthorizedCronRequest({headers: {authorization: 'Bearer wrong-secret'}}, expected)).toBe(false);
    expect(isAuthorizedCronRequest({headers: {}}, expected)).toBe(false);
    expect(isAuthorizedCronRequest({headers: {authorization: `Bearer ${expected}`}}, undefined)).toBe(false);
  });

  it('uses timing safe comparison semantics', () => {
    expect(timingSafeSecretCompare('abc123', 'abc123')).toBe(true);
    expect(timingSafeSecretCompare('abc123', 'abc124')).toBe(false);
    expect(timingSafeSecretCompare('abc123', 'abc123-longer')).toBe(false);
  });
});
