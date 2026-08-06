type JsonResponse = {
  status: (statusCode: number) => JsonResponse;
  json: (body: unknown) => unknown;
};

function envCheck(name: string, required = true) {
  const configured = Boolean(process.env[name]);
  return {
    name,
    status: configured || !required ? 'ok' : 'missing',
    required,
  };
}

export default async function handler(_req: unknown, res: JsonResponse) {
  const checks = [
    envCheck('NODE_ENV', false),
    envCheck('GEMINI_API_KEY', false),
    envCheck('CRON_SECRET', false),
    envCheck('SUPABASE_URL', false),
    envCheck('SUPABASE_SERVICE_ROLE_KEY', false),
  ];

  const requiredFailures = checks.filter((check) => check.required && check.status !== 'ok');

  return res.status(requiredFailures.length > 0 ? 503 : 200).json({
    status: requiredFailures.length > 0 ? 'unhealthy' : 'healthy',
    deployment: 'vercel-functions',
    checkedAt: new Date().toISOString(),
    checks,
  });
}
