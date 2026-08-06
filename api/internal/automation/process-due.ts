import {DurableAutomationEngine} from '../../../src/services/automation/DurableAutomationEngine';
import {isAuthorizedCronRequest} from '../../_lib/cronAuth';

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

  if (!isAuthorizedCronRequest(req, process.env.CRON_SECRET)) {
    return res.status(401).json({success: false, error: 'Unauthorized cron caller. Missing or invalid secret.'});
  }

  try {
    const workerId = `vercel_cron_${Date.now().toString(36)}`;
    const outboxRecovery = await DurableAutomationEngine.processUnprocessedOutboxEvents();
    const stats = await DurableAutomationEngine.processDueActions(workerId, 25);

    return res.status(200).json({
      success: true,
      message: `Cron execution completed by ${workerId}.`,
      outboxRecoveredCount: outboxRecovery.recoveredCount,
      stats,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process due automation actions.',
    });
  }
}
