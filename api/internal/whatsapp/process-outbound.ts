import { createClient } from '@supabase/supabase-js';
import { isAuthorizedCronRequest } from '../_lib/cronAuth';
import { OutboundService, SendMessageOptions } from '../../src/services/whatsapp/OutboundService';

type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type Response = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => Response;
  json: (body: unknown) => unknown;
};

type OutboundJob = {
  id: string;
  tenant_id: string;
  recipient: string;
  payload: Record<string, unknown> | null;
  attempts: number | null;
  max_attempts: number | null;
};

type DeliveryStats = {
  claimed: number;
  sent: number;
  deferred: number;
  failed: number;
};

const RETRYABLE_META_CODES = new Set(['1', '2', '4', '17', '341', '429', '500', '502', '503', '504', '130429', '131016']);

export function boundedBatchSize(value: unknown): number {
  const parsed = Number.parseInt(String(value || '25'), 10);
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 25, 1), 100);
}

export function isRetryableDeliveryFailure(errorCode: unknown): boolean {
  const code = String(errorCode || '');
  return !code || RETRYABLE_META_CODES.has(code) || /^5\\d\\d$/.test(code);
}

export function nextDeliveryAttempt(attempts: number, now = new Date()): string {
  const delayMinutes = Math.min(60, Math.max(1, 2 ** Math.max(0, attempts - 1)));
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

function getDb(): any {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw Object.assign(new Error('WhatsApp delivery queue is not configured.'), { code: 'WHATSAPP_DATABASE_UNAVAILABLE' });
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function toSendOptions(job: OutboundJob): SendMessageOptions {
  const payload = job.payload || {};
  const payloadTenantId = asOptionalString(payload.tenantId);
  if (payloadTenantId && payloadTenantId !== job.tenant_id) {
    throw Object.assign(new Error('Outbound job tenant does not match its payload.'), { code: 'OUTBOUND_JOB_TENANT_MISMATCH' });
  }

  const messageType = asOptionalString(payload.messageType) as SendMessageOptions['messageType'] | undefined;
  const source = asOptionalString(payload.source) as SendMessageOptions['source'] | undefined;

  return {
    tenantId: job.tenant_id,
    recipientPhone: job.recipient,
    messageType,
    textBody: asOptionalString(payload.textBody) || asOptionalString(payload.message),
    templateName: asOptionalString(payload.templateName),
    templateLanguage: asOptionalString(payload.templateLanguage),
    templateComponents: Array.isArray(payload.templateComponents) ? payload.templateComponents : undefined,
    mediaUrl: asOptionalString(payload.mediaUrl),
    conversationId: asOptionalString(payload.conversationId),
    source: source === 'ai' || source === 'template' || source === 'automation' ? source : 'automation',
  };
}

async function claimJobs(db: any, workerId: string, batchSize: number): Promise<OutboundJob[]> {
  const { data, error } = await db.rpc('claim_whatsapp_outbound_jobs', {
    p_worker_id: workerId,
    p_batch_size: batchSize,
    p_lease_seconds: 120,
  });

  if (error) {
    throw Object.assign(new Error('WhatsApp outbound queue is not ready.'), {
      code: error.code === 'PGRST202' ? 'WHATSAPP_OUTBOUND_QUEUE_NOT_READY' : 'WHATSAPP_DELIVERY_CLAIM_FAILED',
    });
  }

  return Array.isArray(data) ? data as OutboundJob[] : [];
}

async function updateJob(db: any, job: OutboundJob, patch: Record<string, unknown>) {
  const { error } = await db
    .from('whatsapp_outbound_jobs')
    .update({...patch, updated_at: new Date().toISOString()})
    .eq('id', job.id)
    .eq('tenant_id', job.tenant_id)
    .eq('status', 'processing');

  if (error) {
    throw error;
  }
}

export async function processQueuedWhatsAppJobs(batchSize = 25): Promise<DeliveryStats> {
  const db = getDb();
  const workerId = `whatsapp_delivery_${Date.now().toString(36)}`;
  const jobs = await claimJobs(db, workerId, boundedBatchSize(batchSize));
  const stats: DeliveryStats = { claimed: jobs.length, sent: 0, deferred: 0, failed: 0 };

  for (const job of jobs) {
    try {
      const result = await OutboundService.sendMessage(toSendOptions(job));
      if (result.success) {
        await updateJob(db, job, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          lease_expires_at: null,
          last_error_code: null,
          last_error_message: null,
          meta_message_id: result.metaMessageId || null,
        });
        stats.sent += 1;
        continue;
      }

      const attempts = job.attempts || 1;
      const maxAttempts = Math.max(job.max_attempts || 5, 1);
      const retryable = isRetryableDeliveryFailure(result.errorCode);
      if (retryable && attempts < maxAttempts) {
        await updateJob(db, job, {
          status: 'pending',
          next_attempt_at: nextDeliveryAttempt(attempts),
          lease_expires_at: null,
          last_error_code: result.errorCode || 'DELIVERY_TEMPORARILY_UNAVAILABLE',
          last_error_message: result.error || 'WhatsApp delivery did not complete.',
        });
        stats.deferred += 1;
      } else {
        await updateJob(db, job, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          lease_expires_at: null,
          last_error_code: result.errorCode || 'DELIVERY_FAILED',
          last_error_message: result.error || 'WhatsApp delivery did not complete.',
        });
        stats.failed += 1;
      }
    } catch (error: any) {
      const attempts = job.attempts || 1;
      const maxAttempts = Math.max(job.max_attempts || 5, 1);
      const code = String(error?.code || 'DELIVERY_EXCEPTION');
      if (isRetryableDeliveryFailure(code) && attempts < maxAttempts) {
        await updateJob(db, job, {
          status: 'pending',
          next_attempt_at: nextDeliveryAttempt(attempts),
          lease_expires_at: null,
          last_error_code: code,
          last_error_message: 'Delivery worker encountered a temporary error.',
        });
        stats.deferred += 1;
      } else {
        await updateJob(db, job, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          lease_expires_at: null,
          last_error_code: code,
          last_error_message: 'Delivery worker could not complete this job.',
        });
        stats.failed += 1;
      }
    }
  }

  return stats;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorizedCronRequest(req, process.env.CRON_SECRET)) {
    return res.status(401).json({ success: false, error: 'Unauthorized cron caller.' });
  }

  try {
    const stats = await processQueuedWhatsAppJobs(boundedBatchSize(req.query?.batchSize));
    return res.status(200).json({ success: true, stats });
  } catch (error: any) {
    console.error('WhatsApp outbound delivery worker failed.', { code: error?.code || 'WHATSAPP_DELIVERY_WORKER_FAILED' });
    return res.status(503).json({
      success: false,
      code: error?.code || 'WHATSAPP_DELIVERY_WORKER_FAILED',
      error: 'WhatsApp delivery worker is temporarily unavailable.',
    });
  }
}
