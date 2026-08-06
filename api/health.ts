import type {VercelRequest, VercelResponse} from '@vercel/node';
import {HealthService} from '../src/system/HealthService';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
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
