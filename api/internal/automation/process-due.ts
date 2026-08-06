import crypto from 'node:crypto';

type CronRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type JsonResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => JsonResponse;
  json: (body: unknown) => unknown;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function extractSecret(req: CronRequest): string | undefined {
  const authorization = firstValue(req.headers.authorization);
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) {
    return match[1];
  }

  return firstValue(req.headers['x-cron-secret']) || firstValue(req.query?.secret);
}

function timingSafeSecretCompare(provided: string, expected: string): boolean {
  try {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export default async function handler(req: CronRequest, res: JsonResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({success: false, error: 'Method not allowed'});
  }

  if (!process.env.CRON_SECRET) {
    return res.status(503).json({
      success: false,
      code: 'AUTOMATION_PROCESSOR_NOT_CONFIGURED',
      error: 'CRON_SECRET environment variable is not configured on the server.',
    });
  }

  const providedSecret = extractSecret(req);
  if (!providedSecret || !timingSafeSecretCompare(providedSecret, process.env.CRON_SECRET)) {
    return res.status(401).json({success: false, error: 'Unauthorized cron caller. Missing or invalid secret.'});
  }

  return res.status(501).json({
    success: false,
    code: 'AUTOMATION_PROCESSOR_NOT_WIRED',
    error: 'Automation processor auth is deployed, but the automation engine must be moved into a Vercel-function-safe module before live cron execution is enabled.',
  });
}
