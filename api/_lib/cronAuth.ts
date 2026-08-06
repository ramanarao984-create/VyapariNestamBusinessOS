import crypto from 'node:crypto';

export type CronAuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

export function timingSafeSecretCompare(provided: string, expected: string): boolean {
  try {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function extractCronSecret(req: CronAuthRequest): string | undefined {
  const authorization = firstHeaderValue(req.headers.authorization);
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  const headerSecret = firstHeaderValue(req.headers['x-cron-secret']);
  if (headerSecret) {
    return headerSecret;
  }

  return firstHeaderValue(req.query?.secret);
}

export function isAuthorizedCronRequest(req: CronAuthRequest, expectedSecret: string | undefined): boolean {
  if (!expectedSecret) {
    return false;
  }

  const providedSecret = extractCronSecret(req);
  return Boolean(providedSecret && timingSafeSecretCompare(providedSecret, expectedSecret));
}
