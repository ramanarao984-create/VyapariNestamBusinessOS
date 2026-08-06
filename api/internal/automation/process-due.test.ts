import {describe, expect, it} from 'vitest';
import {extractSecret, firstValue, isQuietHour, nextQuietHourEnd, timingSafeSecretCompare} from './process-due';

describe('Vercel automation cron helpers', () => {
  it('extracts cron secret from Vercel Bearer auth first', () => {
    expect(
      extractSecret({
        method: 'GET',
        headers: {
          authorization: 'Bearer vercel-secret',
          'x-cron-secret': 'legacy-secret',
        },
      }),
    ).toBe('vercel-secret');
  });

  it('keeps manual operator fallback secrets', () => {
    expect(extractSecret({method: 'POST', headers: {'x-cron-secret': 'header-secret'}})).toBe('header-secret');
    expect(extractSecret({method: 'POST', headers: {}, query: {secret: 'query-secret'}})).toBe('query-secret');
  });

  it('handles repeated query/header values by taking the first value', () => {
    expect(firstValue(['one', 'two'])).toBe('one');
    expect(firstValue('solo')).toBe('solo');
    expect(firstValue(undefined)).toBeUndefined();
  });

  it('uses exact timing-safe secret comparison', () => {
    expect(timingSafeSecretCompare('secret', 'secret')).toBe(true);
    expect(timingSafeSecretCompare('secret', 'wrong')).toBe(false);
    expect(timingSafeSecretCompare('secret', 'secret-longer')).toBe(false);
  });

  it('detects overnight quiet hours', () => {
    const settings = {
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00',
      quiet_hours_end: '08:00',
    };

    expect(isQuietHour(settings, new Date('2026-08-07T22:00:00.000Z'))).toBe(true);
    expect(isQuietHour(settings, new Date('2026-08-07T06:00:00.000Z'))).toBe(true);
    expect(isQuietHour(settings, new Date('2026-08-07T12:00:00.000Z'))).toBe(false);
  });

  it('calculates the next quiet-hour end after the current quiet window', () => {
    expect(
      nextQuietHourEnd(
        {quiet_hours_enabled: true, quiet_hours_start: '21:00', quiet_hours_end: '08:00'},
        new Date('2026-08-07T22:00:00.000Z'),
      ),
    ).toBe('2026-08-08T08:05:00.000Z');
  });
});
