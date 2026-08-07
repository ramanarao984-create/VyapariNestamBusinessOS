import { requireAuthenticatedUser, requireRole } from '../../src/auth/serverAuth';
import { OutboundService } from '../../src/services/whatsapp/OutboundService';

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
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
    requireRole("Owner", "Admin", "Doctor", "Receptionist")(req, res, () => {
      authorized = true;
      resolve();
    });
  });
  if (!authorized) return;

  const { recipient, message, messageType, templateName, templateLanguage, templateComponents, mediaUrl, conversationId } = req.body || {};
  if (!recipient || (!message && !templateName && !mediaUrl)) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields (recipient, message or templateName or mediaUrl)",
    });
  }

  try {
    const result = await OutboundService.sendMessage({
      tenantId: req.auth.tenantId,
      recipientPhone: recipient,
      messageType: messageType || (templateName ? "template" : "text"),
      textBody: message,
      templateName,
      templateLanguage,
      templateComponents,
      mediaUrl,
      source: "human",
      conversationId,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Outbound messaging exception.",
    });
  }
}
