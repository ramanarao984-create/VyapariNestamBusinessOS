import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

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

type ScheduledAction = {
  id: string;
  tenant_id: string;
  workflow_id: string;
  execution_id?: string | null;
  contact_name?: string | null;
  contact_phone: string;
  appointment_id?: string | null;
  action_type: string;
  payload?: Record<string, unknown> | null;
  attempts?: number | null;
  max_attempts?: number | null;
};

type AutomationSettings = {
  global_kill_switch?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
};

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function extractSecret(req: CronRequest): string | undefined {
  const authorization = firstValue(req.headers.authorization);
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) {
    return match[1];
  }

  return firstValue(req.headers['x-cron-secret']) || firstValue(req.query?.secret);
}

export function timingSafeSecretCompare(provided: string, expected: string): boolean {
  try {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function isQuietHour(settings: AutomationSettings, now = new Date()): boolean {
  if (!settings.quiet_hours_enabled) {
    return false;
  }

  const startHour = Number.parseInt((settings.quiet_hours_start || '21:00').split(':')[0], 10);
  const endHour = Number.parseInt((settings.quiet_hours_end || '08:00').split(':')[0], 10);
  const currentHour = now.getHours();

  if (Number.isNaN(startHour) || Number.isNaN(endHour)) {
    return false;
  }

  return startHour > endHour
    ? currentHour >= startHour || currentHour < endHour
    : currentHour >= startHour && currentHour < endHour;
}

export function nextQuietHourEnd(settings: AutomationSettings, now = new Date()): string {
  const endHour = Number.parseInt((settings.quiet_hours_end || '08:00').split(':')[0], 10);
  const nextValid = new Date(now);
  nextValid.setHours(Number.isNaN(endHour) ? 8 : endHour, 5, 0, 0);
  if (nextValid <= now) {
    nextValid.setDate(nextValid.getDate() + 1);
  }
  return nextValid.toISOString();
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for automation cron.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function claimDueActions(supabase: ReturnType<typeof createClient>, workerId: string, batchSize: number): Promise<ScheduledAction[]> {
  const {data, error} = await supabase.rpc('claim_due_automation_actions', {
    p_worker_id: workerId,
    p_batch_size: batchSize,
    p_lease_seconds: 60,
  });

  if (!error && Array.isArray(data)) {
    return data as ScheduledAction[];
  }

  const nowIso = new Date().toISOString();
  const {data: fallbackData, error: fallbackError} = await supabase
    .from('automation_scheduled_actions')
    .select('*')
    .or(`status.eq.pending,status.eq.SCHEDULED,and(status.eq.processing,lease_expires_at.lt.${nowIso})`)
    .lte('scheduled_for', nowIso)
    .lt('attempts', 5)
    .order('scheduled_for', {ascending: true})
    .limit(batchSize);

  if (fallbackError) {
    throw fallbackError;
  }

  const actions = (fallbackData || []) as ScheduledAction[];
  if (actions.length === 0) {
    return [];
  }

  const leaseExpiresAt = new Date(Date.now() + 60_000).toISOString();
  const {error: claimError} = await supabase
    .from('automation_scheduled_actions')
    .update({
      status: 'processing',
      claimed_by: workerId,
      claimed_at: nowIso,
      lease_expires_at: leaseExpiresAt,
      updated_at: nowIso,
    })
    .in('id', actions.map((action) => action.id));

  if (claimError) {
    throw claimError;
  }

  return actions;
}

async function getSettings(supabase: ReturnType<typeof createClient>, tenantId: string): Promise<AutomationSettings> {
  const {data} = await supabase
    .from('automation_settings')
    .select('global_kill_switch, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  return (data || {
    global_kill_switch: false,
    quiet_hours_enabled: true,
    quiet_hours_start: '21:00',
    quiet_hours_end: '08:00',
  }) as AutomationSettings;
}

async function isOptedOut(supabase: ReturnType<typeof createClient>, tenantId: string, phone: string): Promise<boolean> {
  const {data} = await supabase
    .from('whatsapp_consents')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('external_contact_identifier', phone)
    .maybeSingle();

  return data?.status === 'opted_out';
}

async function updateExecution(
  supabase: ReturnType<typeof createClient>,
  executionId: string | null | undefined,
  patch: Record<string, unknown>,
) {
  if (!executionId) {
    return;
  }

  await supabase
    .from('automation_executions')
    .update({...patch, completed_at: new Date().toISOString()})
    .eq('id', executionId);
}

async function enqueueOutboundJob(supabase: ReturnType<typeof createClient>, action: ScheduledAction): Promise<string> {
  const payload = action.payload || {};
  const jobId = `auto_job_${action.id}`;
  const patientName = String(payload.patientName || action.contact_name || 'Patient');
  const appointmentTime = String(payload.appointmentTime || '09:00 AM');
  const templateName = String(payload.templateName || 'appointment_reminder');

  const {error} = await supabase
    .from('whatsapp_outbound_jobs')
    .upsert({
      id: jobId,
      tenant_id: action.tenant_id,
      recipient: action.contact_phone,
      status: 'pending',
      payload: {
        tenantId: action.tenant_id,
        recipientPhone: action.contact_phone,
        messageType: 'template',
        templateName,
        templateLanguage: 'en_US',
        source: 'automation',
        automationActionId: action.id,
        appointmentId: action.appointment_id,
        templateComponents: [
          {
            type: 'body',
            parameters: [
              {type: 'text', text: patientName},
              {type: 'text', text: appointmentTime},
            ],
          },
        ],
      },
      updated_at: new Date().toISOString(),
    }, {onConflict: 'id'});

  if (error) {
    throw error;
  }

  return jobId;
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

  const workerId = `vercel_cron_${Date.now().toString(36)}`;
  const batchSize = Math.min(Number.parseInt(firstValue(req.query?.batchSize) || '25', 10) || 25, 100);

  try {
    const supabase = getSupabaseAdminClient();
    const actions = await claimDueActions(supabase, workerId, batchSize);
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const action of actions) {
      try {
        const settings = await getSettings(supabase, action.tenant_id);

        if (settings.global_kill_switch) {
          await supabase
            .from('automation_scheduled_actions')
            .update({status: 'skipped', last_error: 'Global kill switch enabled', updated_at: new Date().toISOString()})
            .eq('id', action.id);
          await updateExecution(supabase, action.execution_id, {
            status: 'skipped',
            error_code: 'GLOBAL_KILL_SWITCH',
            error_message: 'Global kill switch enabled',
          });
          skipped++;
          continue;
        }

        if (isQuietHour(settings)) {
          await supabase
            .from('automation_scheduled_actions')
            .update({
              status: 'pending',
              scheduled_for: nextQuietHourEnd(settings),
              last_error: 'Postponed due to tenant quiet hours',
              updated_at: new Date().toISOString(),
            })
            .eq('id', action.id);
          skipped++;
          continue;
        }

        if (await isOptedOut(supabase, action.tenant_id, action.contact_phone)) {
          await supabase
            .from('automation_scheduled_actions')
            .update({status: 'skipped', last_error: 'Consent blocked: patient opted out', updated_at: new Date().toISOString()})
            .eq('id', action.id);
          await updateExecution(supabase, action.execution_id, {
            status: 'skipped',
            error_code: 'CONSENT_BLOCKED',
            error_message: 'Patient opted out',
          });
          skipped++;
          continue;
        }

        const jobId = await enqueueOutboundJob(supabase, action);
        await supabase
          .from('automation_scheduled_actions')
          .update({status: 'completed', whatsapp_outbound_job_id: jobId, updated_at: new Date().toISOString()})
          .eq('id', action.id);
        await updateExecution(supabase, action.execution_id, {
          status: 'completed',
          whatsapp_delivery_status: 'queued',
        });
        succeeded++;
      } catch (error: any) {
        const attempts = (action.attempts || 0) + 1;
        const maxAttempts = action.max_attempts || 5;
        const newStatus = attempts >= maxAttempts ? 'failed' : 'pending';
        await supabase
          .from('automation_scheduled_actions')
          .update({
            status: newStatus,
            attempts,
            last_error: error?.message || 'Execution error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', action.id);
        if (newStatus === 'failed') {
          await updateExecution(supabase, action.execution_id, {
            status: 'failed',
            error_code: 'OUTBOUND_ENQUEUE_FAILED',
            error_message: error?.message || 'Failed outbound enqueue',
          });
        }
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      workerId,
      stats: {
        processed: actions.length,
        succeeded,
        failed,
        skipped,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      code: 'AUTOMATION_PROCESSOR_FAILED',
      error: error?.message || 'Failed to process due automation actions.',
    });
  }
}
