// @ts-ignore Vercel bundles the TypeScript server module into this function.
import { requireAuthenticatedUser, requireRole } from '../../src/auth/serverAuth.ts';
// @ts-ignore Vercel bundles the TypeScript server module into this function.
import { OutboundService } from '../../src/services/whatsapp/OutboundService.ts';
import { OutboundValidationError, validateOutboundRequest } from './outboundValidation';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let authenticated = false;
  await new Promise<void>((resolve) => {
    requireAuthenticatedUser(req, res, () => {
      authenticated = true;
      resolve();
    });
  });
  if (!authenticated) return;

  let authorized = false;
  await new Promise<void>((resolve) => {
    requireRole('Owner', 'Admin', 'Doctor', 'Receptionist')(req, res, () => {
      authorized = true;
      resolve();
    });
  });
  if (!authorized) return;

  try {
    const request = validateOutboundRequest(req.body || {});
    const result = await OutboundService.sendMessage({
      tenantId: req.auth.tenantId,
      recipientPhone: request.recipient,
      messageType: request.messageType,
      textBody: request.message,
      templateName: request.templateName,
      templateLanguage: request.templateLanguage,
      templateComponents: request.templateComponents,
      mediaUrl: request.mediaUrl,
      source: 'human',
      conversationId: request.conversationId,
    });

    const status = result.success
      ? 200
      : ['INVALID_CONVERSATION_CONTEXT', 'CONNECTION_NOT_ACTIVE'].includes(result.errorCode || '')
        ? 409
        : 422;

    return res.status(status).json({
      success: result.success,
      metaMessageId: result.metaMessageId,
      error: result.error,
      errorCode: result.errorCode,
      // Do not return raw Meta payloads to the browser. They can contain
      // provider data that is unnecessary for the user-facing workflow.
      messageRecord: result.messageRecord,
    });
  } catch (error: any) {
    if (error instanceof OutboundValidationError) {
      return res.status(400).json({ success: false, error: error.message, errorCode: error.code });
    }

    console.error('Outbound WhatsApp send failed.', { code: error?.code || 'OUTBOUND_MESSAGE_EXCEPTION' });
    return res.status(503).json({
      success: false,
      error: 'Message delivery is temporarily unavailable. Please retry shortly.',
      errorCode: error?.code || 'OUTBOUND_MESSAGE_EXCEPTION',
    });
  }
}