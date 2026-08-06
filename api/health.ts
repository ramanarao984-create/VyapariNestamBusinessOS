import {HealthService} from '../src/system/HealthService';

type JsonResponse = {
  status: (statusCode: number) => JsonResponse;
  json: (body: unknown) => unknown;
};

export default async function handler(_req: unknown, res: JsonResponse) {
  try {
    const report = await HealthService.checkApplicationHealth();
    const status = report.status === 'unhealthy' ? 503 : 200;
    return res.status(status).json(report);
  } catch (error: any) {
    return res.status(500).json({
      status: 'unhealthy',
      checks: [],
      error: error?.message || 'Health check failed',
      checkedAt: new Date().toISOString(),
    });
  }
}
