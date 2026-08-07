async function runMiddleware(req: any, res: any, middleware: any): Promise<boolean> {
  let allowed = false;
  await new Promise<void>((resolve) => {
    middleware(req, res, () => {
      allowed = true;
      resolve();
    });
  });
  return allowed;
}

export default async function handler(req: any, res: any) {
  const { requireAuthenticatedUser, requireProductionAccess, requireRole } =
    await import("../../src/auth/serverAuth");

  if (!(await runMiddleware(req, res, requireAuthenticatedUser))) return;
  if (!(await runMiddleware(req, res, requireProductionAccess))) return;
  if (!(await runMiddleware(req, res, requireRole("Owner", "Admin")))) return;

  const { WhatsAppConnectionService } =
    await import("../../src/services/whatsapp/WhatsAppConnectionService");
  const tenantId = req.auth.tenantId;

  try {
    if (req.method === "GET") {
      return res.status(200).json(
        await WhatsAppConnectionService.getRedactedConnection(tenantId)
      );
    }

    if (req.method === "POST") {
      const { phoneNumberId, accessToken, wabaId, verifyToken, displayPhoneNumber, verifiedName } =
        req.body || {};

      if (!phoneNumberId) {
        return res.status(400).json({ success: false, error: "phoneNumberId is required." });
      }

      const connection = await WhatsAppConnectionService.saveConnection({
        tenantId,
        phoneNumberId,
        accessToken,
        wabaId,
        verifyToken,
        displayPhoneNumber,
        verifiedName,
      });

      return res.status(200).json({ success: true, connection });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const status = error.code === "WHATSAPP_SCHEMA_NOT_READY" ||
      error.code === "WHATSAPP_DATABASE_UNAVAILABLE" ? 503 : 500;
    return res.status(status).json({
      success: false,
      error: error.message || "Failed to access WhatsApp connection.",
      code: error.code,
    });
  }
}
