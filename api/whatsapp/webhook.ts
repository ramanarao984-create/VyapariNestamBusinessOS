import crypto from "crypto";
import { WebhookService } from "../../src/services/whatsapp/WebhookService";
import { WHATSAPP_CONFIG } from "../../src/services/whatsapp/config";
import { logger } from "../../src/services/metadata/logger";
import { ConversationService } from "../../src/services/whatsapp/ConversationService";
import { DurableIdempotencyService } from "../../src/services/whatsapp/DurableIdempotencyService";
import { ConversationWindowEvaluator } from "../../src/services/whatsapp/ConversationWindowEvaluator";
import { CostMeteringService } from "../../src/services/whatsapp/CostMeteringService";
import { ConsentService } from "../../src/services/whatsapp/ConsentService";
import { HandoverMarkerService } from "../../src/services/whatsapp/HandoverMarkerService";
import { OutboundService } from "../../src/services/whatsapp/OutboundService";
import { ActiveFlowService } from "../../src/services/whatsapp/ActiveFlowService";
import { DeterministicRoutingEngine } from "../../src/services/whatsapp/DeterministicRoutingEngine";

export const config = { api: { bodyParser: false } };

function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function timingSafeSecretCompare(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function processWebhook(body: any) {
  for (const entry of body.entry) {
    const tenantId = await WebhookService.resolveTenantFromEntry(entry);
    if (!tenantId) continue;

    const events = WebhookService.parseInboundEventContracts(body, tenantId);
    for (const event of events) {
      await DurableIdempotencyService.processEventWithLock(
        event.providerMessageId,
        tenantId,
        event.eventType,
        async () => {
          const { conversation } = await ConversationService.saveInboundMessage({
            tenantId,
            metaMessageId: event.providerMessageId,
            fromPhoneNumber: event.senderWhatsAppId,
            contactName: event.contactName,
            textBody: event.sanitizedText || "",
            messageType: event.messageType,
            replyToMessageId: event.replyToMessageId,
            timestamp: event.providerTimestamp,
          });

          await ConversationWindowEvaluator.recordInboundTimestamp(
            tenantId,
            conversation.id,
            event.providerTimestamp
          );
          await CostMeteringService.trackUsage(tenantId, "inbound", event.messageType);

          const consentCmd = ConsentService.evaluateConsentCommand(event.sanitizedText);
          if (consentCmd === "OPT_OUT") {
            await ConsentService.updateConsent(tenantId, event.senderWhatsAppId, "opted_out", "inbound_msg", "STOP");
            await HandoverMarkerService.markHandoverRequired(tenantId, conversation.id, "OPT_OUT", { command: "STOP" });
            await OutboundService.sendMessage({
              tenantId,
              recipientPhone: event.senderWhatsAppId,
              textBody: "You have been unsubscribed from WhatsApp automated updates. Text START anytime to re-subscribe.",
              source: "automation",
              conversationId: conversation.id,
              isOptOutConfirmation: true,
            });
            return;
          }

          if (consentCmd === "OPT_IN") {
            await ConsentService.updateConsent(tenantId, event.senderWhatsAppId, "opted_in", "inbound_msg", "START");
            await OutboundService.sendMessage({
              tenantId,
              recipientPhone: event.senderWhatsAppId,
              textBody: "Welcome back! You have re-subscribed to clinic WhatsApp notifications.",
              source: "automation",
              conversationId: conversation.id,
            });
            return;
          }

          if (await ConsentService.getConsentStatus(tenantId, event.senderWhatsAppId) === "opted_out") return;

          const activeFlow = await ActiveFlowService.getActiveFlow(tenantId, conversation.id);
          const routeResult = await DeterministicRoutingEngine.routeInboundEvent(event, activeFlow);

          if (routeResult.requiresHandover) {
            await HandoverMarkerService.markHandoverRequired(
              tenantId,
              conversation.id,
              routeResult.reasonCode,
              { routeCategory: routeResult.routeCategory }
            );
          }

          if (routeResult.deterministicResponseText && conversation.automation_mode === "ai_active") {
            await OutboundService.sendMessage({
              tenantId,
              recipientPhone: event.senderWhatsAppId,
              textBody: routeResult.deterministicResponseText,
              source: "automation",
              conversationId: conversation.id,
            });
          }
        }
      );
    }

    for (const statusObj of WebhookService.parseStatusUpdates(body, tenantId)) {
      await ConversationService.updateMessageStatus(statusObj);
      await CostMeteringService.trackUsage(tenantId, "status", statusObj.status);
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const result = WebhookService.verifyWebhookHandshake(req.query || {});
    return result.success
      ? res.status(200).send(result.challenge || "")
      : res.status(403).send("Forbidden");
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!WHATSAPP_CONFIG.META_APP_SECRET) {
    logger.error("WebhookServer", "META_APP_SECRET is not configured.");
    return res.status(503).json({ error: "Webhook signature configuration missing" });
  }
  if (!WebhookService.validateWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid HMAC signature" });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody.toString("utf8") || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  if (!Array.isArray(body.entry)) return res.status(200).json({ status: "ignored" });

  try {
    await processWebhook(body);
    return res.status(200).json({ status: "processed" });
  } catch (error: any) {
    logger.error("WebhookServer", "Webhook processing failed", error);
    return res.status(503).json({ error: "Webhook persistence unavailable", code: error.code || "WHATSAPP_DATABASE_UNAVAILABLE" });
  }
}
